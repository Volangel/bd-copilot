export function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

/**
 * Normalize URLs for deduping:
 * - lower-case host
 * - strip fragments
 * - drop common tracking params
 * - collapse trailing slash (except root)
 */
export function normalizeUrl(raw: string) {
  if (!isHttpUrl(raw)) return null;
  try {
    const url = new URL(raw);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "referrer", "fbclid", "gclid", "msclkid"];
    trackingParams.forEach((p) => url.searchParams.delete(p));

    let pathname = url.pathname;
    if (pathname.endsWith("/") && pathname !== "/") {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname || "/";

    return url.toString();
  } catch {
    return null;
  }
}
