import * as cheerio from "cheerio";
import { normalizeUrl } from "./urlUtils";

/**
 * Site-specific extractors for crypto data aggregator sites.
 * These sites list projects with internal detail pages - we extract those
 * internal project links which can then be used to find the actual project websites.
 */

export interface SiteExtractorResult {
  /** URLs extracted using site-specific logic */
  projectUrls: string[];
  /** Whether this site was handled by a specific extractor */
  handled: boolean;
}

/**
 * Configuration for supported aggregator sites
 */
interface SiteConfig {
  /** Hostname patterns to match (without www) */
  hostPatterns: string[];
  /** Extract project URLs from the HTML */
  extract: (html: string, baseUrl: string) => string[];
}

const SOCIAL_DOMAINS = [
  "twitter.com",
  "x.com",
  "facebook.com",
  "linkedin.com",
  "instagram.com",
  "t.me",
  "telegram.me",
  "discord.gg",
  "discord.com",
  "github.com",
  "medium.com",
  "youtube.com",
  "reddit.com",
  "tiktok.com",
];

const BLOCKED_DOMAINS = [
  ...SOCIAL_DOMAINS,
  // CDN and infrastructure
  "cloudflare.com",
  "googleapis.com",
  "gstatic.com",
  "googletagmanager.com",
  "google-analytics.com",
  "jsdelivr.net",
  "unpkg.com",
  "cdnjs.cloudflare.com",
  // Common non-project links
  "apple.com",
  "play.google.com",
  "chrome.google.com",
  "docs.google.com",
];

function isBlockedDomain(url: string): boolean {
  return BLOCKED_DOMAINS.some((domain) => url.includes(domain));
}

/**
 * RootData extractor
 * Project detail pages: /Projects/detail/{name}?k={id}
 * Project list pages: /Projects, /rankings/*, /rootdatalist
 */
const rootDataExtractor: SiteConfig = {
  hostPatterns: ["rootdata.com"],
  extract: (html: string, baseUrl: string): string[] => {
    const $ = cheerio.load(html);
    const urls: string[] = [];
    const base = new URL(baseUrl);

    // Extract internal project detail links
    $("a[href*='/Projects/detail/']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          const resolved = new URL(href, baseUrl).toString();
          const normalized = normalizeUrl(resolved);
          if (normalized) urls.push(normalized);
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Also look for external project website links in project cards
    // RootData often has outbound links to project websites
    $("a[href^='http']").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href) return;

      try {
        const url = new URL(href);
        const host = url.hostname.replace(/^www\./, "");

        // Skip internal RootData links
        if (host === "rootdata.com") return;

        // Skip blocked domains
        if (isBlockedDomain(href)) return;

        // Look for links that appear to be project websites
        // (often in specific containers or with certain classes)
        const parent = $(el).parent();
        const hasProjectContext =
          parent.hasClass("project") ||
          parent.closest("[class*='project']").length > 0 ||
          parent.closest("[class*='card']").length > 0 ||
          $(el).attr("target") === "_blank";

        if (hasProjectContext || isLikelyProjectUrl(href)) {
          const normalized = normalizeUrl(href);
          if (normalized) urls.push(normalized);
        }
      } catch {
        // Skip invalid URLs
      }
    });

    return [...new Set(urls)];
  },
};

/**
 * CryptoRank extractor
 * Project pages: /price/{slug}, /ico/{slug}, /currencies/{slug}
 * List pages: /, /categories/*, /ecosystems/*
 */
const cryptoRankExtractor: SiteConfig = {
  hostPatterns: ["cryptorank.io"],
  extract: (html: string, baseUrl: string): string[] => {
    const $ = cheerio.load(html);
    const urls: string[] = [];

    // Extract internal project/price links
    const projectPatterns = [
      'a[href*="/price/"]',
      'a[href*="/ico/"]',
      'a[href*="/currencies/"]',
      'a[href*="/coin/"]',
    ];

    projectPatterns.forEach((selector) => {
      $(selector).each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          try {
            const resolved = new URL(href, baseUrl).toString();
            // Only include cryptorank.io internal project links
            if (resolved.includes("cryptorank.io")) {
              const normalized = normalizeUrl(resolved);
              if (normalized) urls.push(normalized);
            }
          } catch {
            // Skip invalid URLs
          }
        }
      });
    });

    // Also extract external project website links
    $("a[href^='http']").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href) return;

      try {
        const url = new URL(href);
        const host = url.hostname.replace(/^www\./, "");

        // Skip internal CryptoRank links
        if (host === "cryptorank.io") return;

        // Skip blocked domains
        if (isBlockedDomain(href)) return;

        // Look for external project links (typically in tables or cards)
        const isInTable = $(el).closest("table, tr, td").length > 0;
        const isInCard = $(el).closest("[class*='card'], [class*='project'], [class*='coin']").length > 0;
        const hasExternalIcon = $(el).find("[class*='external'], [class*='link']").length > 0;

        if (isInTable || isInCard || hasExternalIcon || isLikelyProjectUrl(href)) {
          const normalized = normalizeUrl(href);
          if (normalized) urls.push(normalized);
        }
      } catch {
        // Skip invalid URLs
      }
    });

    return [...new Set(urls)];
  },
};

/**
 * DefiLlama extractor
 * Protocol pages: /protocol/{slug}
 * List pages: /, /protocols, /chains, /recent
 */
const defiLlamaExtractor: SiteConfig = {
  hostPatterns: ["defillama.com", "llama.fi"],
  extract: (html: string, baseUrl: string): string[] => {
    const $ = cheerio.load(html);
    const urls: string[] = [];

    // Extract internal protocol links
    $('a[href*="/protocol/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          const resolved = new URL(href, baseUrl).toString();
          // Only include defillama internal protocol links
          if (resolved.includes("defillama.com") || resolved.includes("llama.fi")) {
            const normalized = normalizeUrl(resolved);
            if (normalized) urls.push(normalized);
          }
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Also look for /chain/ links
    $('a[href*="/chain/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          const resolved = new URL(href, baseUrl).toString();
          if (resolved.includes("defillama.com") || resolved.includes("llama.fi")) {
            const normalized = normalizeUrl(resolved);
            if (normalized) urls.push(normalized);
          }
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Extract external project website links
    $("a[href^='http']").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href) return;

      try {
        const url = new URL(href);
        const host = url.hostname.replace(/^www\./, "");

        // Skip internal DefiLlama links
        if (host === "defillama.com" || host === "llama.fi") return;

        // Skip blocked domains
        if (isBlockedDomain(href)) return;

        // DefiLlama typically shows external links in table rows or protocol cards
        const isInTable = $(el).closest("table, tr, td").length > 0;
        const hasProtocolContext =
          $(el).closest("[class*='protocol'], [class*='row']").length > 0;
        const isExternalLink = $(el).attr("target") === "_blank";

        if (isInTable || hasProtocolContext || isExternalLink || isLikelyProjectUrl(href)) {
          const normalized = normalizeUrl(href);
          if (normalized) urls.push(normalized);
        }
      } catch {
        // Skip invalid URLs
      }
    });

    return [...new Set(urls)];
  },
};

/**
 * DappRadar extractor
 * DApp pages: /dapp/{slug}
 */
const dappRadarExtractor: SiteConfig = {
  hostPatterns: ["dappradar.com"],
  extract: (html: string, baseUrl: string): string[] => {
    const $ = cheerio.load(html);
    const urls: string[] = [];

    // Extract internal dapp links
    $('a[href*="/dapp/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          const resolved = new URL(href, baseUrl).toString();
          if (resolved.includes("dappradar.com")) {
            const normalized = normalizeUrl(resolved);
            if (normalized) urls.push(normalized);
          }
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Extract external links
    $("a[href^='http']").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const url = new URL(href);
        const host = url.hostname.replace(/^www\./, "");
        if (host === "dappradar.com") return;
        if (isBlockedDomain(href)) return;

        if (isLikelyProjectUrl(href)) {
          const normalized = normalizeUrl(href);
          if (normalized) urls.push(normalized);
        }
      } catch {
        // Skip invalid URLs
      }
    });

    return [...new Set(urls)];
  },
};

/**
 * CoinGecko extractor
 * Coin pages: /en/coins/{slug}
 */
const coinGeckoExtractor: SiteConfig = {
  hostPatterns: ["coingecko.com"],
  extract: (html: string, baseUrl: string): string[] => {
    const $ = cheerio.load(html);
    const urls: string[] = [];

    // Extract internal coin links
    $('a[href*="/coins/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          const resolved = new URL(href, baseUrl).toString();
          if (resolved.includes("coingecko.com")) {
            const normalized = normalizeUrl(resolved);
            if (normalized) urls.push(normalized);
          }
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Extract external project links
    $("a[href^='http']").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const url = new URL(href);
        const host = url.hostname.replace(/^www\./, "");
        if (host.includes("coingecko.com")) return;
        if (isBlockedDomain(href)) return;

        const isInTable = $(el).closest("table, tr, td").length > 0;
        if (isInTable || isLikelyProjectUrl(href)) {
          const normalized = normalizeUrl(href);
          if (normalized) urls.push(normalized);
        }
      } catch {
        // Skip invalid URLs
      }
    });

    return [...new Set(urls)];
  },
};

/**
 * CoinMarketCap extractor
 * Coin pages: /currencies/{slug}
 */
const coinMarketCapExtractor: SiteConfig = {
  hostPatterns: ["coinmarketcap.com"],
  extract: (html: string, baseUrl: string): string[] => {
    const $ = cheerio.load(html);
    const urls: string[] = [];

    // Extract internal currency links
    $('a[href*="/currencies/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          const resolved = new URL(href, baseUrl).toString();
          if (resolved.includes("coinmarketcap.com")) {
            const normalized = normalizeUrl(resolved);
            if (normalized) urls.push(normalized);
          }
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Extract external links
    $("a[href^='http']").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const url = new URL(href);
        const host = url.hostname.replace(/^www\./, "");
        if (host.includes("coinmarketcap.com")) return;
        if (isBlockedDomain(href)) return;

        if (isLikelyProjectUrl(href)) {
          const normalized = normalizeUrl(href);
          if (normalized) urls.push(normalized);
        }
      } catch {
        // Skip invalid URLs
      }
    });

    return [...new Set(urls)];
  },
};

// All site-specific extractors
const SITE_EXTRACTORS: SiteConfig[] = [
  rootDataExtractor,
  cryptoRankExtractor,
  defiLlamaExtractor,
  dappRadarExtractor,
  coinGeckoExtractor,
  coinMarketCapExtractor,
];

/**
 * Check if a URL looks like a crypto project website
 */
function isLikelyProjectUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const projectKeywords = [
    "protocol",
    "finance",
    "defi",
    ".fi",
    ".xyz",
    ".io",
    ".app",
    ".network",
    ".exchange",
    "swap",
    "dao",
    "token",
    "chain",
    "labs",
    "capital",
    "ventures",
    "fund",
    "wallet",
    "bridge",
    "stake",
    "yield",
    "lend",
    "borrow",
    "vault",
    "pool",
  ];
  return projectKeywords.some((kw) => lower.includes(kw));
}

/**
 * Get the hostname from a URL (without www)
 */
function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Find the appropriate extractor for a given URL
 */
function findExtractor(url: string): SiteConfig | null {
  const host = getHost(url);
  if (!host) return null;

  for (const extractor of SITE_EXTRACTORS) {
    if (extractor.hostPatterns.some((pattern) => host.includes(pattern))) {
      return extractor;
    }
  }
  return null;
}

/**
 * Extract project URLs using site-specific logic if available
 */
export function extractWithSiteSpecific(
  html: string,
  baseUrl: string
): SiteExtractorResult {
  const extractor = findExtractor(baseUrl);

  if (extractor) {
    const projectUrls = extractor.extract(html, baseUrl);
    return {
      projectUrls,
      handled: true,
    };
  }

  return {
    projectUrls: [],
    handled: false,
  };
}

/**
 * Check if a URL is from a known aggregator site
 */
export function isAggregatorSite(url: string): boolean {
  return findExtractor(url) !== null;
}

/**
 * Get the list of supported aggregator site patterns
 */
export function getSupportedAggregators(): string[] {
  return SITE_EXTRACTORS.flatMap((e) => e.hostPatterns);
}
