import { authOptions } from "@/lib/auth";
import { canUseRealAI } from "@/lib/ai/aiService";
import { callOpenAIChat } from "@/lib/ai/providers/openai";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { load } from "cheerio";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const bodySchema = z.object({
  url: z.string().url(),
});

function pickBest(values: (string | null | undefined)[]): string | null {
  for (const v of values) {
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function stripLinkedInTitle(title?: string | null) {
  if (!title) return null;
  const parts = title.split("|");
  if (parts.length > 1) return parts[0].trim();
  return title.trim();
}

function extractEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function nameFromSlug(pathname: string) {
  const parts = pathname
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const last = decodeURIComponent(parts[parts.length - 1] || "").replace(/[-_]+/g, " ").trim();
  const cleaned = last;
  if (!cleaned) return null;
  return cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function roleFromTitle(title?: string | null) {
  if (!title) return null;
  // Common LinkedIn format: "Role - Company | LinkedIn"
  const parts = title.split("-");
  if (parts.length > 1) {
    return parts[0].trim();
  }
  return null;
}

function extractAnchors(html: string) {
  const $ = load(html);
  const anchors: { href: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    const text = ($(el).text() || "").trim();
    if (!href) return;
    anchors.push({ href, text: text.slice(0, 120) });
    if (anchors.length >= 25) return false;
  });
  return anchors;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = bodySchema.parse(await request.json());
    let parsed: URL;
    try {
      parsed = new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const htmlResult = await fetchHtml(body.url).catch(() => ({ html: "", text: "" }));
    const textSnippet = (htmlResult.text || "").slice(0, 4000);

    const titleMatch = htmlResult.html.match(/<title>([^<]+)<\/title>/i);
    const ogTitle = htmlResult.html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDesc = htmlResult.html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const metaDesc = htmlResult.html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i);

    const rawTitle = pickBest([titleMatch?.[1], ogTitle?.[1]]);
    const description = pickBest([ogDesc?.[1], metaDesc?.[1]]);
    const slugName = nameFromSlug(parsed.pathname);
    const anchors = extractAnchors(htmlResult.html || "");

    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    const linkedSlug =
      hostname.includes("linkedin.com") && path.includes("/in/")
        ? (() => {
            const match = path.match(/\/in\/([^/]+)/);
            if (match?.[1]) return nameFromSlug(`/${match[1]}`);
            return null;
          })()
        : null;

    const heuristicName =
      hostname.includes("linkedin.com") && path.includes("/in/")
        ? stripLinkedInTitle(rawTitle) || linkedSlug || slugName
        : hostname.includes("twitter.com") || hostname.includes("x.com")
          ? stripLinkedInTitle(rawTitle) || slugName
          : rawTitle || slugName;

    const heuristicRole = roleFromTitle(rawTitle) || (description && description.split("|")[0]?.trim()) || null;
    const heuristicEmail = extractEmail(textSnippet) || extractEmail(description || "");

    const twitterCandidate = (() => {
      if (!(hostname.includes("twitter.com") || hostname.includes("x.com"))) return null;
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (!segments.length) return null;
      const handle = segments[0];
      if (!handle || handle.toLowerCase() === "status") return null;
      return handle.startsWith("@") ? handle : `@${handle}`;
    })();

    const anchorEmail = anchors.find((a) => a.href.startsWith("mailto:"))?.href.replace(/^mailto:/i, "") || null;
    const anchorTelegram = anchors.find((a) => a.href.includes("t.me/"))?.href || null;
    const anchorTwitter = (() => {
      const found = anchors.find((a) => a.href.includes("twitter.com/") || a.href.includes("x.com/"));
      if (!found) return null;
      try {
        const u = new URL(found.href, "https://twitter.com");
        const seg = u.pathname.split("/").filter(Boolean)[0];
        if (!seg || seg.toLowerCase() === "status") return null;
        return seg.startsWith("@") ? seg : `@${seg}`;
      } catch {
        return null;
      }
    })();

    const suggestion = {
      name: heuristicName || slugName || "",
      role: heuristicRole || description || "",
      linkedinUrl: hostname.includes("linkedin.com") ? body.url : null,
      twitterHandle: twitterCandidate || anchorTwitter,
      telegram: hostname.includes("t.me") ? body.url : anchorTelegram,
      email: heuristicEmail || anchorEmail,
    };

    const plan = session.user.plan ?? "free";
    if (!canUseRealAI(plan)) {
      return NextResponse.json({ suggestion });
    }

    try {
      const system =
        "You are an assistant that reads a social/profile page snippet and extracts contact details. Return ONLY valid JSON with fields name, role, linkedinUrl, twitterHandle, email, telegram. Do not add markdown or backticks.";
      const user = [
        `URL: ${body.url}`,
        `Title: ${rawTitle || "n/a"}`,
        `Description: ${description || "n/a"}`,
        `Slug-derived name: ${slugName || "n/a"}`,
        `Anchors (href/text pairs): ${anchors
          .slice(0, 10)
          .map((a) => `[${a.href}] ${a.text}`)
          .join(" | ")}`,
        `Text snippet: ${textSnippet.slice(0, 1200)}`,
        ``,
        `Return JSON: { "name": string, "role": string|null, "linkedinUrl": string|null, "twitterHandle": string|null, "email": string|null, "telegram": string|null }`,
      ].join("\n");

      const ai = await callOpenAIChat<{
        name?: string;
        role?: string | null;
        linkedinUrl?: string | null;
        twitterHandle?: string | null;
        email?: string | null;
        telegram?: string | null;
      }>({
        model: process.env.AI_MODEL_ANALYZE || "gpt-4.1-mini",
        system,
        user,
        maxTokens: 500,
      });

      const finalSuggestion = {
        name: ai.name?.trim() || suggestion.name,
        role: ai.role?.trim() || suggestion.role,
        linkedinUrl: ai.linkedinUrl || suggestion.linkedinUrl,
        twitterHandle: ai.twitterHandle || suggestion.twitterHandle,
        email: ai.email || suggestion.email,
        telegram: ai.telegram || suggestion.telegram,
      };

      return NextResponse.json({ suggestion: finalSuggestion });
    } catch (err) {
      console.error("[contacts/enrich-from-url] ai error", { message: (err as Error).message });
      return NextResponse.json({ suggestion });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[contacts/enrich-from-url] error", error);
    return NextResponse.json({ error: "Failed to enrich from URL" }, { status: 500 });
  }
}
