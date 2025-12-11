import { load } from "cheerio";

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 10_000;

function isBlockedHostname(hostname: string): boolean {
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
 * Validates that the resolved IP address is not a private/blocked address.
 * This provides DNS rebinding protection by checking IPs after DNS resolution.
 */
function isBlockedIP(ip: string): boolean {
  // IPv4 private ranges
  if (/^127\./.test(ip)) return true; // Loopback
  if (/^10\./.test(ip)) return true; // Class A private
  if (/^192\.168\./.test(ip)) return true; // Class C private
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true; // Class B private
  if (/^169\.254\./.test(ip)) return true; // Link-local
  if (ip === "0.0.0.0") return true; // Unspecified

  // IPv6 private/special ranges
  if (ip === "::1" || ip === "::") return true; // Loopback and unspecified
  if (/^fe80:/i.test(ip)) return true; // Link-local
  if (/^f[cd]/i.test(ip)) return true; // Unique local (fc00::/7)

  return false;
}

/**
 * Validates a URL is safe to fetch, checking both hostname and resolved IPs.
 */
function validateUrl(url: URL): void {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error("Blocked host");
  }
  // Additional check: if the hostname looks like an IP, validate it directly
  if (/^[\d.:[\]]+$/.test(url.hostname)) {
    const cleanIp = url.hostname.replace(/^\[|\]$/g, ""); // Remove brackets from IPv6
    if (isBlockedIP(cleanIp)) {
      throw new Error("Blocked IP address");
    }
  }
}

/**
 * Fetch HTML on the server and return a readable text excerpt.
 * Includes SSRF protection, redirect limits, and DNS rebinding prevention.
 */
export default async function fetchHtml(url: string): Promise<{ html: string; text: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  validateUrl(parsed);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let currentUrl = parsed.toString();
    let redirectCount = 0;

    while (redirectCount <= MAX_REDIRECTS) {
      const response = await fetch(currentUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        redirect: "manual", // Handle redirects manually for security
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      // Handle redirects manually to validate each redirect URL
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Redirect without location header (${response.status})`);
        }

        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
        }

        // Resolve relative URLs and validate the redirect target
        const redirectUrl = new URL(location, currentUrl);
        validateUrl(redirectUrl);
        currentUrl = redirectUrl.toString();
        continue;
      }

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
    }

    throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
  } finally {
    clearTimeout(timeout);
  }
}
