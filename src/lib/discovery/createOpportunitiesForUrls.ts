import { analyzeProject, scoreProject } from "@/lib/ai/aiService";
import { serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { Opportunity } from "@prisma/client";
import { isHttpUrl, normalizeUrl } from "@/lib/discovery/urlUtils";
import { extractPageTitle } from "@/lib/discovery/pageTitle";

type SourceType = "TEXT_SCAN" | "PAGE_SCAN";

type Options = {
  userId: string;
  urls: string[];
  sourceType: SourceType;
  sourceLabel?: string;
  rawContext?: string;
  maxCount?: number;
};

export async function createOpportunitiesForUrls(options: Options) {
  const { userId, urls, sourceType, sourceLabel, rawContext, maxCount = 10 } = options;
  const uniqueUrls = Array.from(new Set(urls)).filter(isHttpUrl);
  const icp = await prisma.iCPProfile.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const userPlan = user?.plan ?? "free";

  const created: Opportunity[] = [];
  let skipped = 0;

  const seenNormalized = new Set<string>();

  // Respect max count after normalization/dedupe
  const filtered = [];
  for (const url of uniqueUrls) {
    const normalized = normalizeUrl(url) || url;
    if (seenNormalized.has(normalized)) {
      skipped += 1;
      continue;
    }
    seenNormalized.add(normalized);
    filtered.push({ raw: url, normalized });
    if (filtered.length >= maxCount) break;
  }

  for (const entry of filtered) {
    const url = entry.raw;
    const normalized = entry.normalized;

    const exists = await prisma.opportunity.findFirst({
      where: { userId, OR: [{ url }, { url: normalized }] },
    });
    const projectExists = await prisma.project.findFirst({
      where: { userId, OR: [{ url }, { url: normalized }] },
    });
    if (exists || projectExists) continue;

    try {
      const htmlResult = await fetchHtml(url);
      const pageTitle = extractPageTitle(htmlResult.html);
      const analysis = await analyzeProject({ html: htmlResult.text, url, icpProfile: icp ?? null, userPlan });
      const scoring = await scoreProject({ analysis, icpProfile: icp ?? null, userPlan });

      const opportunity = await prisma.opportunity.create({
        data: {
          userId,
          sourceType,
          sourceLabel: sourceLabel || null,
          rawContext: rawContext || null,
          url,
          title: pageTitle || analysis.summary.slice(0, 120),
          tags: serializeJson(analysis.categoryTags),
          icpScore: scoring.score,
          mqaScore: analysis.mqaScore,
          bdAngles: serializeJson(analysis.bdAngles),
        },
      });

      created.push(opportunity);
    } catch (err) {
      console.error("[lib/discovery/createOpportunitiesForUrls] failed", { url, message: (err as Error).message });
      // Fallback: create a minimal opportunity so it still shows up for review
      try {
        const fallback = await prisma.opportunity.create({
          data: {
            userId,
            sourceType,
            sourceLabel: sourceLabel || null,
            rawContext: rawContext || null,
            url,
            title: url,
            tags: null,
            icpScore: null,
            mqaScore: null,
            bdAngles: null,
          },
        });
        created.push(fallback);
      } catch (innerErr) {
        console.error("Fallback create failed for", url, innerErr);
      }
    }
  }

  return { created, skipped, attempted: filtered.length };
}
