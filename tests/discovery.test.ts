import { describe, expect, it } from "vitest";
import { extractUrlsFromText } from "../src/lib/discovery/urlFromText";
import { extractCandidateUrlsFromHtml } from "../src/lib/discovery/candidatesFromHtml";

describe("extractUrlsFromText", () => {
  it("finds a single URL", () => {
    const urls = extractUrlsFromText("Check https://example.com for details");
    expect(urls).toEqual(["https://example.com"]);
  });

  it("finds multiple URLs on separate lines", () => {
    const urls = extractUrlsFromText("First: https://a.com\nSecond: http://b.org");
    expect(urls.sort()).toEqual(["http://b.org", "https://a.com"].sort());
  });

  it("trims trailing punctuation", () => {
    const urls = extractUrlsFromText("Visit https://example.com, and then https://other.io.");
    expect(urls).toEqual(["https://example.com", "https://other.io"]);
  });

  it("returns empty for no urls", () => {
    const urls = extractUrlsFromText("No links here");
    expect(urls).toEqual([]);
  });
});

describe("extractCandidateUrlsFromHtml", () => {
  const html = `
    <html>
      <body>
        <a href="https://project.io">Project</a>
        <a href="/internal">Internal</a>
        <a href="https://twitter.com/user">Twitter</a>
        <a href="mailto:test@example.com">Mail</a>
      </body>
    </html>
  `;

  it("returns external urls and skips socials", () => {
    const urls = extractCandidateUrlsFromHtml(html, "https://host.com");
    expect(urls.some((u) => u.startsWith("https://project.io"))).toBe(true);
    expect(urls.every((u) => !u.includes("twitter.com"))).toBe(true);
  });

  it("handles missing tags gracefully", () => {
    const emptyHtml = "<html><body>No links</body></html>";
    const urls = extractCandidateUrlsFromHtml(emptyHtml, "https://host.com");
    expect(urls).toEqual([]);
  });
});
