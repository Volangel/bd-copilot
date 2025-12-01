import fetchHtml from "@/lib/scraper/fetchHtml";
import { load } from "cheerio";

type ParsedSocial = {
  name: string | null;
  role: string | null;
  handle: string | null;
  url: string;
};

const NAME_REGEX = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/;

function guessHandleFromUrl(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

export async function parseSocial(url: string): Promise<ParsedSocial> {
  let name: string | null = null;
  let role: string | null = null;
  const handle: string | null = guessHandleFromUrl(url);

  try {
    const { html } = await fetchHtml(url);
    const $ = load(html);
    const title = $("title").first().text();
    const desc = $('meta[name="description"]').attr("content") || $("meta[property='og:description']").attr("content") || "";
    const ogTitle = $("meta[property='og:title']").attr("content") || "";

    const blob = [title, ogTitle, desc].join(" ").trim();
    const match = blob.match(NAME_REGEX);
    if (match) name = match[1];

    if (/founder|co-?founder|ceo|cto|cpo|head|lead|director|vp/i.test(blob)) {
      const roleMatch = blob.match(/(founder|co-?founder|ceo|cto|cpo|head of [^,]+|lead [^,]+|director|vp [^,]+)/i);
      role = roleMatch ? roleMatch[1] : null;
    }
  } catch (err) {
    console.error("parseSocial failed", err);
  }

  return { name, role, handle, url };
}
