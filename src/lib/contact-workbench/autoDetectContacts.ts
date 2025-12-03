import fetchHtml from "@/lib/scraper/fetchHtml";
import { load } from "cheerio";
import type { AnyNode } from "domhandler";

export type DetectedContact = {
  name: string | null;
  role: string | null;
  linkedinUrl?: string;
  twitterHandle?: string;
  telegram?: string;
};

const ROLE_KEYWORDS = ["founder", "co-founder", "ceo", "cto", "cpo", "lead", "head", "growth", "bd", "partnerships", "engineer", "developer"];

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extract handle from Twitter/Telegram URL, handling trailing slashes and query params
 */
function extractHandleFromUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const handle = pathParts[pathParts.length - 1];
    return handle || null;
  } catch {
    return null;
  }
}

export async function autoDetectContacts(url: string): Promise<DetectedContact[]> {
  const candidates: DetectedContact[] = [];
  try {
    const { html } = await fetchHtml(url);
    const $ = load(html);

    $("a[href]").each((_, el) => {
      const href = ($(el).attr("href") || "").trim();
      if (!href) return;
      const text = cleanText($(el).text());
      const nearby = cleanText($(el).parent().text() || "");

      if (/linkedin\.com\/in\//i.test(href)) {
        candidates.push({
          name: text || null,
          role: ROLE_KEYWORDS.find((r) => nearby.toLowerCase().includes(r)) || null,
          linkedinUrl: href.startsWith("http") ? href : new URL(href, url).toString(),
        });
      }
      if (/twitter\.com|x\.com/i.test(href)) {
        const handle = extractHandleFromUrl(href);
        candidates.push({
          name: text || null,
          role: ROLE_KEYWORDS.find((r) => nearby.toLowerCase().includes(r)) || null,
          twitterHandle: handle ? `@${handle}` : undefined,
        });
      }
      if (/t\.me\//i.test(href)) {
        const handle = extractHandleFromUrl(href);
        candidates.push({
          name: text || null,
          role: ROLE_KEYWORDS.find((r) => nearby.toLowerCase().includes(r)) || null,
          telegram: handle ? `@${handle}` : undefined,
        });
      }
    });

    // JSON-LD person entries often include richer data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el)
          .contents()
          .toArray()
          .map((n: AnyNode) => (n as unknown as { data?: string }).data || "")
          .join("");
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        items.forEach((item) => {
          if (item?.["@type"] === "Person" || item?.["@type"] === "person") {
            const sameAs: string[] = Array.isArray(item.sameAs) ? item.sameAs : [];
            const linkedinUrl = sameAs.find((s) => /linkedin\.com\/in\//i.test(s));
            const twitter = sameAs.find((s) => /twitter\.com|x\.com/i.test(s));
            const telegram = sameAs.find((s) => /t\.me\//i.test(s));
            const twitterHandle = twitter ? extractHandleFromUrl(twitter) : null;
            const telegramHandle = telegram ? extractHandleFromUrl(telegram) : null;
            candidates.push({
              name: item.name || null,
              role: item.jobTitle || item.role || null,
              linkedinUrl,
              twitterHandle: twitterHandle ? `@${twitterHandle}` : undefined,
              telegram: telegramHandle ? `@${telegramHandle}` : undefined,
            });
          }
        });
      } catch {
        /* ignore malformed json-ld */
      }
    });

    // dedupe by linkedin or twitter or telegram or name
    const seen = new Set<string>();
    return candidates.filter((c) => {
      // Skip contacts without any identifying information
      const key = c.linkedinUrl || c.twitterHandle || c.telegram || c.name;
      if (!key) return false; // Cannot dedupe without identifiers
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (err) {
    console.error("autoDetectContacts failed", err);
    return [];
  }
}
