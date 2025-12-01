import { load } from "cheerio";

function isBlockedHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  const blockedPrefixes = ["localhost", "127.", "0.0.0.0", "169.254.", "10.", "192.168."];
  const blocked172 = /^172\.(1[6-9]|2[0-9]|3[0-1])\./;
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local") || lower === "::1") return true;
  if (blockedPrefixes.some((p) => lower.startsWith(p))) return true;
  if (blocked172.test(lower)) return true;
  return false;
}

/**
 * Fetch HTML on the server and return a readable text excerpt.
 * Basic SSRF guard: only http(s) and no obvious local/private targets.
 */
export default async function fetchHtml(url: string): Promise<{ html: string; text: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Blocked host");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        // Using a browser-like UA helps some sites avoid blocking the request
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL (${response.status})`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > 2_000_000) {
      throw new Error("Response too large");
    }

    const html = await response.text();
    const $ = load(html);
    $("script, style, noscript").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    // Avoid returning enormous payloads
    return { html: html.slice(0, 2_000_000), text: text.slice(0, 20_000) };
  } finally {
    clearTimeout(timeout);
  }
}
