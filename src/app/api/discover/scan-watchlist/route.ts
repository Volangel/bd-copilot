import { authOptions } from "@/lib/auth";
import { extractCandidateUrlsFromHtml, isAggregatorSite } from "@/lib/discovery/candidatesFromHtml";
import { isHttpUrl } from "@/lib/discovery/urlUtils";
import { createOpportunities } from "@/lib/opportunity/createOpportunities";
import { prisma } from "@/lib/prisma";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

/**
 * For aggregator sites, extract external project URLs from detail pages
 */
async function extractFromAggregatorDetailPages(
  internalLinks: string[],
  baseUrl: string,
  maxDetailPages: number = 10
): Promise<string[]> {
  const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
  const externalUrls: string[] = [];

  // Filter to only internal detail page links
  const detailPages = internalLinks
    .filter((url) => {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        return host === baseHost || host.includes(baseHost);
      } catch {
        return false;
      }
    })
    .slice(0, maxDetailPages);

  // Fetch detail pages in parallel to extract external project URLs
  const results = await Promise.allSettled(
    detailPages.map(async (detailUrl) => {
      try {
        const html = await fetchHtml(detailUrl);
        const candidates = extractCandidateUrlsFromHtml(html.html, detailUrl);
        return candidates.filter((url) => {
          try {
            const host = new URL(url).hostname.replace(/^www\./, "");
            return !host.includes(baseHost);
          } catch {
            return false;
          }
        });
      } catch (err) {
        console.error("Failed to fetch detail page:", detailUrl, err);
        return [];
      }
    })
  );

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      externalUrls.push(...result.value);
    }
  });

  return [...new Set(externalUrls)];
}

/**
 * Process a single watchlist URL and extract candidates
 */
async function processWatchlistUrl(url: string): Promise<string[]> {
  const htmlResult = await fetchHtml(url);
  const initialCandidates = extractCandidateUrlsFromHtml(htmlResult.html, url).filter(isHttpUrl);

  if (isAggregatorSite(url) && initialCandidates.length > 0) {
    const baseHost = new URL(url).hostname.replace(/^www\./, "");
    const internalLinks = initialCandidates.filter((u) => {
      try {
        const host = new URL(u).hostname.replace(/^www\./, "");
        return host === baseHost || host.includes(baseHost);
      } catch {
        return false;
      }
    });
    const externalLinks = initialCandidates.filter((u) => {
      try {
        const host = new URL(u).hostname.replace(/^www\./, "");
        return host !== baseHost && !host.includes(baseHost);
      } catch {
        return false;
      }
    });

    if (internalLinks.length > 0) {
      const detailPageUrls = await extractFromAggregatorDetailPages(internalLinks, url, 10);
      return [...new Set([...externalLinks, ...detailPageUrls])];
    }
    return externalLinks;
  }

  return initialCandidates;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const watchlist = await prisma.watchlistUrl.findMany({ where: { userId: session.user.id } });
    // Process watchlist items in parallel for better performance
    const results = await Promise.allSettled(
      watchlist.map(async (item) => {
        const candidates = await processWatchlistUrl(item.url);
        return createOpportunities({
          userId: session.user.id,
          urls: candidates.length ? candidates : [item.url],
          sourceType: "WATCHLIST",
          sourceLabel: item.label || item.url,
          rawContext: "",
          maxCount: 20,
        });
      })
    );

    let totalCreated = 0;
    let totalSkipped = 0;
    let failed = 0;

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        totalCreated += result.value.created.length;
        totalSkipped += result.value.skipped.length;
      } else {
        failed += 1;
        console.error("watchlist scan failed for", watchlist[idx]?.url, result.reason);
      }
    });

    return NextResponse.json({
      createdCount: totalCreated,
      skippedCount: totalSkipped,
      attempted: watchlist.length,
      failed,
    });
  } catch (error) {
    console.error("scan-watchlist failed", error);
    return NextResponse.json({ error: "Failed to scan watchlist" }, { status: 500 });
  }
}
