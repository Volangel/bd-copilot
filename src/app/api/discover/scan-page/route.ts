import { authOptions } from "@/lib/auth";
import { extractCandidateUrlsFromHtml } from "@/lib/discovery/candidatesFromHtml";
import { isHttpUrl } from "@/lib/discovery/urlUtils";
import { createOpportunities } from "@/lib/opportunity/createOpportunities";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const schema = z.object({ url: z.string().url(), sourceLabel: z.string().optional() });

function prioritizeCandidates(urls: string[], baseUrl: string) {
  const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
  const keywords = ["project", "app", "dao", "protocol", "labs", "xyz", "finance", "defi", "nft", "token"];

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
      if (keywords.some((k) => lower.includes(k))) score += 3;
      return { url: u, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.url);
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
    try {
      const htmlResult = await fetchHtml(url);
      candidates = extractCandidateUrlsFromHtml(htmlResult.html, url).filter(isHttpUrl);
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
