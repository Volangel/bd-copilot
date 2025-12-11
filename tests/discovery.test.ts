import { describe, expect, it } from "vitest";
import { extractUrlsFromText } from "../src/lib/discovery/urlFromText";
import { extractCandidateUrlsFromHtml, isAggregatorSite } from "../src/lib/discovery/candidatesFromHtml";
import { extractWithSiteSpecific, getSupportedAggregators } from "../src/lib/discovery/siteSpecificExtractors";

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

describe("isAggregatorSite", () => {
  it("identifies rootdata.com as aggregator", () => {
    expect(isAggregatorSite("https://www.rootdata.com/Projects")).toBe(true);
    expect(isAggregatorSite("https://rootdata.com/rankings")).toBe(true);
  });

  it("identifies cryptorank.io as aggregator", () => {
    expect(isAggregatorSite("https://cryptorank.io/")).toBe(true);
    expect(isAggregatorSite("https://cryptorank.io/price/bitcoin")).toBe(true);
  });

  it("identifies defillama.com as aggregator", () => {
    expect(isAggregatorSite("https://defillama.com/")).toBe(true);
    expect(isAggregatorSite("https://defillama.com/protocols")).toBe(true);
  });

  it("identifies other aggregators", () => {
    expect(isAggregatorSite("https://dappradar.com/")).toBe(true);
    expect(isAggregatorSite("https://coingecko.com/")).toBe(true);
    expect(isAggregatorSite("https://coinmarketcap.com/")).toBe(true);
  });

  it("returns false for non-aggregator sites", () => {
    expect(isAggregatorSite("https://uniswap.org")).toBe(false);
    expect(isAggregatorSite("https://aave.com")).toBe(false);
  });
});

describe("extractWithSiteSpecific", () => {
  it("extracts RootData project detail links", () => {
    const html = `
      <html>
        <body>
          <a href="/Projects/detail/Uniswap?k=MTI=">Uniswap</a>
          <a href="https://www.rootdata.com/Projects/detail/Aave?k=MjM=">Aave</a>
          <a href="https://twitter.com/rootdata">Twitter</a>
          <a href="https://uniswap.org" target="_blank">Website</a>
        </body>
      </html>
    `;
    const result = extractWithSiteSpecific(html, "https://www.rootdata.com/Projects");
    expect(result.handled).toBe(true);
    expect(result.projectUrls.some((u) => u.includes("/Projects/detail/Uniswap"))).toBe(true);
    expect(result.projectUrls.some((u) => u.includes("/Projects/detail/Aave"))).toBe(true);
    // Should include external project link
    expect(result.projectUrls.some((u) => u.includes("uniswap.org"))).toBe(true);
    // Should NOT include social links
    expect(result.projectUrls.every((u) => !u.includes("twitter.com"))).toBe(true);
  });

  it("extracts DefiLlama protocol links", () => {
    const html = `
      <html>
        <body>
          <a href="/protocol/uniswap">Uniswap</a>
          <a href="/protocol/aave">Aave</a>
          <a href="/chain/ethereum">Ethereum</a>
          <a href="https://github.com/defillama">GitHub</a>
        </body>
      </html>
    `;
    const result = extractWithSiteSpecific(html, "https://defillama.com/protocols");
    expect(result.handled).toBe(true);
    expect(result.projectUrls.some((u) => u.includes("/protocol/uniswap"))).toBe(true);
    expect(result.projectUrls.some((u) => u.includes("/protocol/aave"))).toBe(true);
    expect(result.projectUrls.some((u) => u.includes("/chain/ethereum"))).toBe(true);
    // Should NOT include github
    expect(result.projectUrls.every((u) => !u.includes("github.com"))).toBe(true);
  });

  it("extracts CryptoRank price links", () => {
    const html = `
      <html>
        <body>
          <a href="/price/bitcoin">Bitcoin</a>
          <a href="/price/ethereum">Ethereum</a>
          <a href="https://discord.gg/cryptorank">Discord</a>
        </body>
      </html>
    `;
    const result = extractWithSiteSpecific(html, "https://cryptorank.io/");
    expect(result.handled).toBe(true);
    expect(result.projectUrls.some((u) => u.includes("/price/bitcoin"))).toBe(true);
    expect(result.projectUrls.some((u) => u.includes("/price/ethereum"))).toBe(true);
    // Should NOT include discord
    expect(result.projectUrls.every((u) => !u.includes("discord"))).toBe(true);
  });

  it("returns unhandled for non-aggregator sites", () => {
    const html = `<html><body><a href="https://example.com">Link</a></body></html>`;
    const result = extractWithSiteSpecific(html, "https://random-site.com/");
    expect(result.handled).toBe(false);
    expect(result.projectUrls).toEqual([]);
  });
});

describe("getSupportedAggregators", () => {
  it("returns list of supported aggregator patterns", () => {
    const aggregators = getSupportedAggregators();
    expect(aggregators).toContain("rootdata.com");
    expect(aggregators).toContain("cryptorank.io");
    expect(aggregators).toContain("defillama.com");
    expect(aggregators).toContain("dappradar.com");
    expect(aggregators).toContain("coingecko.com");
    expect(aggregators).toContain("coinmarketcap.com");
  });
});
