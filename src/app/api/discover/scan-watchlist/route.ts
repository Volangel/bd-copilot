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
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const item of watchlist) {
      try {
        const html = await fetchHtml(item.url);
        const candidates = extractCandidateUrlsFromHtml(html.html, item.url);
        const result = await createOpportunities({
          userId: session.user.id,
          urls: candidates.length ? candidates : [item.url],
          sourceType: "WATCHLIST",
          sourceLabel: item.label || item.url,
          rawContext: "",
          maxCount: 20,
        });
        totalCreated += result.created.length;
        totalSkipped += result.skipped.length;
      } catch (err) {
        console.error("watchlist scan failed for", item.url, err);
      }
    }

    return NextResponse.json({ createdCount: totalCreated, skippedCount: totalSkipped });
  } catch (error) {
    console.error("scan-watchlist failed", error);
    return NextResponse.json({ error: "Failed to scan watchlist" }, { status: 500 });
  }
}
