import { authOptions } from "@/lib/auth";
import { extractCandidateUrlsFromHtml, isAggregatorSite } from "@/lib/discovery/candidatesFromHtml";
import { isHttpUrl } from "@/lib/discovery/urlUtils";
import { createOpportunities } from "@/lib/opportunity/createOpportunities";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const schema = z.object({ url: z.string().url(), sourceLabel: z.string().optional() });

const PROJECT_KEYWORDS = ["project", "app", "dao", "protocol", "labs", "xyz", "finance", "defi", "nft", "token", "chain", "swap", "bridge", "vault", "stake", "yield", "lend"];

function prioritizeCandidates(urls: string[], baseUrl: string) {
  const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");

  return urls
    .map((u) => {
      const host = (() => {
        try {
          return new URL(u).hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      })();
      const lower = u.toLowerCase();
      let score = 0;
      if (host && host !== baseHost) score += 2;
      if (PROJECT_KEYWORDS.some((k) => lower.includes(k))) score += 3;
      return { url: u, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.url);
}

/**
 * For aggregator sites, extract external project URLs from detail pages
 * This handles the two-stage extraction: listing page -> detail pages -> external URLs
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
        // Extract external URLs from detail page
        const candidates = extractCandidateUrlsFromHtml(html.html, detailUrl);
        return candidates.filter((url) => {
          try {
            const host = new URL(url).hostname.replace(/^www\./, "");
            // Only keep truly external URLs (not the aggregator site)
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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { url, sourceLabel } = schema.parse(body);
    if (!isHttpUrl(url)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    let candidates: string[] = [];
    const isAggregator = isAggregatorSite(url);

    try {
      const htmlResult = await fetchHtml(url);
      const initialCandidates = extractCandidateUrlsFromHtml(htmlResult.html, url).filter(isHttpUrl);

      if (isAggregator && initialCandidates.length > 0) {
        // For aggregator sites, check if we got internal detail page links
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

        // If we have internal detail page links, fetch them to get external project URLs
        if (internalLinks.length > 0) {
          const detailPageUrls = await extractFromAggregatorDetailPages(internalLinks, url, 15);
          // Combine external links from listing page and detail pages
          candidates = [...new Set([...externalLinks, ...detailPageUrls])];
        } else {
          candidates = externalLinks;
        }
      } else {
        candidates = initialCandidates;
      }

      candidates = prioritizeCandidates(candidates, url);
    } catch (err) {
      console.error("scan-page: failed to fetch page, falling back to source url", err);
      candidates = [url];
    }

    if (candidates.length === 0) {
      // Fall back to using the provided URL as the only candidate so the user still gets an opportunity
      candidates = [url];
    }

    const result = await createOpportunities({
      userId: session.user.id,
      urls: candidates,
      sourceType: "PAGE_SCAN",
      sourceLabel: sourceLabel || url,
      rawContext: "",
      maxCount: 20,
    });

    return NextResponse.json({
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
      attempted: result.attempted,
      created: result.created,
      isAggregator,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("API_ERROR: /api/discover/scan-page", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to scan page" }, { status: 500 });
  }
}
