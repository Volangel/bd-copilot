import * as cheerio from "cheerio";
import { normalizeUrl } from "./urlUtils";

const SOCIAL_DOMAINS = ["twitter.com", "x.com", "facebook.com", "linkedin.com", "instagram.com", "t.me", "telegram.me", "discord.gg", "discord.com", "github.com", "medium.com"];

function isSocial(href: string) {
  return SOCIAL_DOMAINS.some((domain) => href.includes(domain));
}

function extractMetaUrls(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const meta: string[] = [];
  const canonical = $("link[rel='canonical']").attr("href");
  const ogUrl = $("meta[property='og:url']").attr("content");

  [canonical, ogUrl].forEach((href) => {
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl).toString();
      const normalized = normalizeUrl(resolved);
      if (normalized) meta.push(normalized);
    } catch {
      return;
    }
  });

  return meta;
}

export function extractCandidateUrlsFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (href.startsWith("#")) return;

    let resolved: string;
    try {
      resolved = new URL(href, baseUrl).toString();
    } catch {
      return;
    }

    if (isSocial(resolved)) return;

    // Skip internal links (same host) - we're looking for external project opportunities
    const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
    const resolvedHost = new URL(resolved).hostname.replace(/^www\./, "");
    if (resolvedHost === baseHost) return;

    // Skip links with fragments as they're typically anchor links
    if (resolved.includes("#")) return;

    const normalized = normalizeUrl(resolved);
    if (normalized) {
      urls.push(normalized);
    }
  });

  const combined = [...urls, ...extractMetaUrls(html, baseUrl)];

  return Array.from(new Set(combined));
}
