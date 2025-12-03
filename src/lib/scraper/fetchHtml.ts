import { load } from "cheerio";

function isBlockedHostname(hostname: string) {
  const lower = hostname.toLowerCase();

  // Block localhost variants
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local")) return true;

  // Block IPv4 loopback (127.0.0.0/8)
  if (lower.startsWith("127.") || lower === "0.0.0.0") return true;

  // Block IPv6 loopback
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;

  // Block cloud metadata services (169.254.0.0/16, specifically 169.254.169.254)
  if (lower.startsWith("169.254.")) return true;

  // Block private network ranges
  if (lower.startsWith("10.") || lower.startsWith("192.168.")) return true;

  // Block 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  const blocked172 = /^172\.(1[6-9]|2[0-9]|3[0-1])\./;
  if (blocked172.test(lower)) return true;

  // Block IPv6 link-local (fe80::/10) and unique local (fd00::/8)
  if (lower.startsWith("fe80:") || lower.startsWith("fd") || lower.startsWith("fc")) return true;

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

    // Validate Content-Type to ensure we're fetching HTML
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`Invalid content type: ${contentType} (expected text/html)`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > 2_000_000) {
      throw new Error("Response too large");
    }

    const html = await response.text();
    const $ = load(html);
    $("script, style, noscript").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    // Validate that we extracted meaningful content
    if (!text || text.length < 10) {
      throw new Error("No meaningful content extracted from page");
    }

    // Avoid returning enormous payloads
    return { html: html.slice(0, 2_000_000), text: text.slice(0, 20_000) };
  } finally {
    clearTimeout(timeout);
  }
}
