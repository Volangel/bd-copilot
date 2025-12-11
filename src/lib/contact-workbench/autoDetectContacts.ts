import fetchHtml from "@/lib/scraper/fetchHtml";
import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import {
  parseLinkedInUrl,
  parseTwitterUrl,
  parseTelegramUrl,
} from "@/lib/contacts/socials/parsers";

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
        const parsed = parseLinkedInUrl(href);
        candidates.push({
          name: text || null,
          role: ROLE_KEYWORDS.find((r) => nearby.toLowerCase().includes(r)) || null,
          linkedinUrl: parsed.isValid ? parsed.canonicalUrl : (href.startsWith("http") ? href : new URL(href, url).toString()),
        });
      }
      if (/twitter\.com|x\.com/i.test(href)) {
        const parsed = parseTwitterUrl(href);
        candidates.push({
          name: text || null,
          role: ROLE_KEYWORDS.find((r) => nearby.toLowerCase().includes(r)) || null,
          twitterHandle: parsed.isValid ? parsed.handle : undefined,
        });
      }
      if (/t\.me\//i.test(href)) {
        const parsed = parseTelegramUrl(href);
        candidates.push({
          name: text || null,
          role: ROLE_KEYWORDS.find((r) => nearby.toLowerCase().includes(r)) || null,
          telegram: parsed.isValid ? parsed.handle : undefined,
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
            const twitterParsed = twitter ? parseTwitterUrl(twitter) : null;
            const telegramParsed = telegram ? parseTelegramUrl(telegram) : null;
            candidates.push({
              name: item.name || null,
              role: item.jobTitle || item.role || null,
              linkedinUrl,
              twitterHandle: twitterParsed?.isValid ? twitterParsed.handle : undefined,
              telegram: telegramParsed?.isValid ? telegramParsed.handle : undefined,
            });
          }
        });
      } catch {
        /* ignore malformed json-ld */
      }
    });

    // Dedupe and merge contacts with same identifiers
    const contactMap = new Map<string, DetectedContact>();

    for (const c of candidates) {
      // Skip contacts without any identifying information
      if (!c.linkedinUrl && !c.twitterHandle && !c.telegram && !c.name) continue;

      // Create multiple keys for cross-referencing
      const keys: string[] = [];
      if (c.linkedinUrl) keys.push(`linkedin:${c.linkedinUrl.toLowerCase()}`);
      if (c.twitterHandle) keys.push(`twitter:${c.twitterHandle.toLowerCase()}`);
      if (c.telegram) keys.push(`telegram:${c.telegram.toLowerCase()}`);
      if (c.name) keys.push(`name:${c.name.toLowerCase()}`);

      // Find existing contact with any matching key
      let existingKey: string | null = null;
      let existing: DetectedContact | null = null;
      for (const key of keys) {
        if (contactMap.has(key)) {
          existingKey = key;
          existing = contactMap.get(key)!;
          break;
        }
      }

      if (existing && existingKey) {
        // Merge with existing contact - prefer non-null values
        const merged: DetectedContact = {
          name: existing.name || c.name,
          role: existing.role || c.role,
          linkedinUrl: existing.linkedinUrl || c.linkedinUrl,
          twitterHandle: existing.twitterHandle || c.twitterHandle,
          telegram: existing.telegram || c.telegram,
        };

        // Update all keys to point to merged contact
        for (const key of keys) {
          contactMap.set(key, merged);
        }
        // Also update the original key
        contactMap.set(existingKey, merged);
      } else {
        // New contact - add all keys
        for (const key of keys) {
          contactMap.set(key, c);
        }
      }
    }

    // Get unique contacts from the map
    const uniqueContacts = new Set<DetectedContact>();
    for (const contact of contactMap.values()) {
      uniqueContacts.add(contact);
    }

    return Array.from(uniqueContacts);
  } catch (err) {
    console.error("autoDetectContacts failed", err);
    return [];
  }
}
