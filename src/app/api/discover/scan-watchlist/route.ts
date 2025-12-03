import { authOptions } from "@/lib/auth";
import { extractCandidateUrlsFromHtml } from "@/lib/discovery/candidatesFromHtml";
import { createOpportunities } from "@/lib/opportunity/createOpportunities";
import { prisma } from "@/lib/prisma";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const watchlist = await prisma.watchlistUrl.findMany({ where: { userId: session.user.id } });
    // Process watchlist items in parallel for better performance
    const results = await Promise.allSettled(
      watchlist.map(async (item) => {
        const html = await fetchHtml(item.url);
        const candidates = extractCandidateUrlsFromHtml(html.html, item.url);
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
