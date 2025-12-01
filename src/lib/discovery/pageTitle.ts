import * as cheerio from "cheerio";

/**
 * Extract a human-friendly page title from HTML.
 * Tries: og:title -> <title> -> first <h1>
 */
export function extractPageTitle(html: string): string | null {
  try {
    const $ = cheerio.load(html);
    const og = $("meta[property='og:title']").attr("content");
    if (og && og.trim()) return og.trim();

    const title = $("title").first().text();
    if (title && title.trim()) return title.trim();

    const h1 = $("h1").first().text();
    if (h1 && h1.trim()) return h1.trim();
  } catch {
    // ignore parsing errors
  }
  return null;
}
