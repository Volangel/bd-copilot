import { callOpenAIChat } from "@/lib/ai/providers/openai";
import { mockExtractContactCandidates } from "./mocks";
import { ContactCandidate, PersonSnippet } from "./types";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { load } from "cheerio";

export interface DeepContactDiscoveryInput {
  projectUrl: string;
  projectName?: string | null;
  userPlan: string;
}

export interface DeepContactDiscoveryResult {
  pages: {
    url: string;
    title: string;
    html: string;
  }[];
}

const TEAM_KEYWORDS = ["team", "about", "people", "contributors", "leadership", "core", "founders", "company", "who-we-are", "our-story"];
const PAID_PLANS = new Set(["starter", "pro", "enterprise"]);

function canUseRealAI(plan: string | null | undefined): boolean {
  if (process.env.AI_PROVIDER_ENABLED !== "true") return false;
  if (!process.env.OPENAI_API_KEY) return false;
  if (!plan) return false;
  return PAID_PLANS.has(plan);
}

export async function collectTeamPages(input: DeepContactDiscoveryInput): Promise<DeepContactDiscoveryResult> {
  const pages: DeepContactDiscoveryResult["pages"] = [];
  const rootUrl = input.projectUrl;

  try {
    const root = await fetchHtml(rootUrl);
    const $ = load(root.html);
    pages.push({ url: rootUrl, title: $("title").first().text() || "Home", html: root.html.slice(0, 12000) });

    const candidates = new Set<string>();
    $("a[href]").each((_, el) => {
      const href = ($(el).attr("href") || "").trim();
      const text = ($(el).text() || "").toLowerCase();
      const lowerHref = href.toLowerCase();
      const hasKeyword =
        TEAM_KEYWORDS.some((k) => text.includes(k)) || TEAM_KEYWORDS.some((k) => lowerHref.includes(k));
      if (!hasKeyword) return;
      try {
        const normalized = new URL(href, rootUrl).toString();
        const rootHost = new URL(rootUrl).host;
        if (!normalized.includes(rootHost)) return;
        candidates.add(normalized.split("#")[0]);
      } catch {
        /* ignore bad url */
      }
    });

    for (const link of Array.from(candidates).slice(0, 4)) {
      try {
        const page = await fetchHtml(link);
        const $$ = load(page.html);
        pages.push({ url: link, title: $$("title").first().text() || link, html: page.html.slice(0, 12000) });
      } catch (err) {
        console.error("[collectTeamPages] fetch failed", { url: link, message: (err as Error).message });
      }
    }
  } catch (err) {
    console.error("[collectTeamPages] root fetch failed", { url: rootUrl, message: (err as Error).message });
  }

  return { pages };
}

export function extractPersonSnippetsFromPages(pages: { url: string; title: string; html: string }[]): PersonSnippet[] {
  const snippets: PersonSnippet[] = [];
  const NAME_REGEX = /\b[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?\b/;
  const ROLE_HINTS = ["founder", "co-founder", "cto", "ceo", "cpo", "lead", "head", "business", "growth", "bd", "partnership", "marketing", "product", "engineering", "security"];

  pages.forEach((page) => {
    const $ = load(page.html);
    $("body *").each((idx, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length < 5 || text.length > 500) return;
      const nameMatch = text.match(NAME_REGEX);
      if (!nameMatch) return;
      const name = nameMatch[0];
      const roleHint = ROLE_HINTS.find((r) => text.toLowerCase().includes(r));
      if (!roleHint) return;
      const parent = $(el).parent();
      const parentText = parent.text().replace(/\s+/g, " ").trim().slice(0, 400);
      const anchors = parent
        .find("a[href]")
        .toArray()
        .map((a) => {
          const href = $(a).attr("href") || "";
          const t = $(a).text().trim();
          return { href, text: t };
        });
      const snippet: PersonSnippet = {
        id: `${page.url}#${idx}`,
        pageUrl: page.url,
        pageTitle: page.title || null,
        nameText: name,
        roleText: roleHint,
        surroundingText: parentText,
        anchors,
      };
      snippets.push(snippet);
    });
  });

  const seen = new Set<string>();
  const deduped: PersonSnippet[] = [];
  snippets.forEach((s) => {
    const key = `${s.pageUrl}-${(s.nameText || "").toLowerCase()}-${(s.roleText || "").toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(s);
  });

  return deduped;
}

export function enrichSnippetsWithSocials(snippets: PersonSnippet[]): PersonSnippet[] {
  return snippets.map((s) => {
    const socials: { linkedin?: string | null; twitter?: string | null; email?: string | null; telegram?: string | null } = {};
    s.anchors.forEach((a) => {
      const href = a.href || "";
      if (/linkedin\.com\/in\//i.test(href)) socials.linkedin = href;
      if (/twitter\.com|x\.com/i.test(href)) {
        const handle = href.split("/").pop();
        if (handle) socials.twitter = `@${handle}`;
      }
      if (href.startsWith("mailto:")) socials.email = href.replace("mailto:", "");
      if (/t\.me\//i.test(href)) {
        const handle = href.split("/").pop();
        if (handle) socials.telegram = `@${handle}`;
      }
    });
    return {
      ...s,
      anchors: s.anchors,
      nameText: s.nameText,
      roleText: s.roleText,
      surroundingText: s.surroundingText,
      pageUrl: s.pageUrl,
      pageTitle: s.pageTitle,
      socials,
    } as PersonSnippet & { socials: typeof socials };
  });
}

export async function extractContactCandidatesFromSnippets(params: {
  projectUrl: string;
  projectName?: string | null;
  snippets: (PersonSnippet & { socials?: { linkedin?: string | null; twitter?: string | null; email?: string | null; telegram?: string | null } })[];
  userPlan: string;
}): Promise<ContactCandidate[]> {
  const { projectUrl, projectName, snippets, userPlan } = params;
  if (!canUseRealAI(userPlan)) return mockExtractContactCandidates({ pages: [], projectUrl, projectName, userPlan });

  const batches: typeof snippets[] = [];
  for (let i = 0; i < snippets.length; i += 12) {
    batches.push(snippets.slice(i, i + 12));
  }

  const all: ContactCandidate[] = [];
  const runBatch = async (batch: typeof snippets, inclusive = false) => {
    const batchText = batch
      .map((s, idx) => {
        const anchorText = s.anchors
          .map((a) => `- ${a.text || a.href} (${a.href})`)
          .join("\n");
        const socials = s.socials
          ? `Socials: linkedin=${s.socials.linkedin ?? "-"}, twitter=${s.socials.twitter ?? "-"}, email=${
              s.socials.email ?? "-"
            }, telegram=${s.socials.telegram ?? "-"}`
          : "";
        return [
          `Snippet #${idx + 1}`,
          `pageUrl: ${s.pageUrl}`,
          s.pageTitle ? `pageTitle: ${s.pageTitle}` : null,
          s.nameText ? `nameText: ${s.nameText}` : null,
          s.roleText ? `roleText: ${s.roleText}` : null,
          `surroundingText: ${s.surroundingText}`,
          socials,
          anchorText ? `anchors:\n${anchorText}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const system =
      "You read snippets about potential team members from a project's site. Identify real people who are part of the team (founders, leadership, BD, technical owners). Return ONLY valid JSON.";
    const instructions = inclusive
      ? "Be slightly more inclusive; advisors and clearly associated ambassadors can be included. Do not invent data not present."
      : "Skip generic text or non-people. Do not invent data not present.";

    const resp = await callOpenAIChat<{ contacts?: ContactCandidate[] }>({
      model: process.env.AI_MODEL_CONTACTS || "gpt-4o-mini",
      system,
      user: [
        `Project URL: ${projectUrl}`,
        projectName ? `Project name: ${projectName}` : null,
        instructions,
        `Return ONLY JSON of the form:`,
        `{ "contacts": [ { "name": "string", "role": "string|null", "linkedinUrl": "string|null", "twitterHandle": "string|null", "email": "string|null", "telegram": "string|null", "sourceUrl": "string|null", "tags": ["founder","cto","bd","tech","marketing"] } ] }`,
        ``,
        batchText,
      ]
        .filter(Boolean)
        .join("\n"),
      maxTokens: 900,
    });

    if (!resp || !Array.isArray(resp.contacts)) return;
    resp.contacts.forEach((c) => {
      const name = (c.name || "").trim();
      if (!name) return;
      all.push({
        name,
        role: c.role || null,
        linkedinUrl: c.linkedinUrl || null,
        twitterHandle: c.twitterHandle || null,
        email: c.email || null,
        telegram: c.telegram || null,
        sourceUrl: c.sourceUrl || null,
        tags: Array.isArray(c.tags) ? c.tags.filter((t) => typeof t === "string" && t.trim().length > 0) : [],
        sourceType: "ai",
      });
    });
  };

  // Track results per batch for selective retry
  const batchResults: number[] = [];
  for (const batch of batches) {
    const beforeCount = all.length;
    await runBatch(batch, false);
    batchResults.push(all.length - beforeCount);
  }

  // If we found very few contacts, retry batches that yielded no results with inclusive mode
  if (all.length < 2 && batches.length > 0) {
    const emptyBatchIndices = batchResults
      .map((count, idx) => (count === 0 ? idx : -1))
      .filter((idx) => idx >= 0);

    // Retry empty batches with inclusive mode, up to 2 batches to avoid excessive API calls
    for (const idx of emptyBatchIndices.slice(0, 2)) {
      await runBatch(batches[idx], true);
    }

    // If still no contacts and all batches had results but low count, try first batch inclusive
    if (all.length < 2 && emptyBatchIndices.length === 0 && batches.length > 0) {
      await runBatch(batches[0], true);
    }
  }

  const dedup: ContactCandidate[] = [];
  const seen = new Set<string>();
  all.forEach((c) => {
    const key = `${c.name.toLowerCase()}-${(c.role || "").toLowerCase()}-${(c.linkedinUrl || "").toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    dedup.push(c);
  });

  return dedup;
}
