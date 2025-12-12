import { analyzeProject, scoreProject } from "@/lib/ai/aiService";
import { serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { normalizeUrl } from "@/lib/discovery/urlUtils";
import { extractPageTitle } from "@/lib/discovery/pageTitle";
import { scoreOpportunity } from "@/lib/opportunity/scoreOpportunity";
import { Opportunity, Playbook } from "@prisma/client";

type SourceType = "TEXT_SCAN" | "PAGE_SCAN" | "WATCHLIST";

type Options = {
  userId: string;
  urls: string[];
  sourceType: SourceType;
  rawContext?: string;
  sourceLabel?: string;
  maxCount?: number;
};

export async function createOpportunities(options: Options) {
  const { userId, urls, sourceType, rawContext, sourceLabel, maxCount = 20 } = options;
  const icp = await prisma.iCPProfile.findUnique({ where: { userId } });
  const playbooks: Playbook[] = await prisma.playbook.findMany({ where: { userId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const userPlan = user?.plan ?? "free";

  const seen = new Set<string>();
  const final: Opportunity[] = [];
  const skipped: string[] = [];

  for (const urlRaw of urls) {
    if (final.length >= maxCount) break;

    const normalized = normalizeUrl(urlRaw);
    if (!normalized) {
      console.warn("[lib/opportunity/createOpportunities] URL normalization failed, using raw:", urlRaw);
    }
    const urlToUse = normalized || urlRaw;

    if (seen.has(urlToUse)) {
      skipped.push(urlRaw);
      continue;
    }
    seen.add(urlToUse);

    // Check for existing opportunity OR project with this URL
    const urlConditions = [{ url: urlRaw }];
    if (normalized && normalized !== urlRaw) {
      urlConditions.push({ url: normalized });
    }
    const [existingOpportunity, existingProject] = await Promise.all([
      prisma.opportunity.findFirst({
        where: { userId, OR: urlConditions },
      }),
      prisma.project.findFirst({
        where: { userId, OR: urlConditions },
      }),
    ]);

    if (existingOpportunity || existingProject) {
      skipped.push(urlRaw);
      continue;
    }

    try {
      const htmlResult = await fetchHtml(urlRaw);
      const pageTitle = extractPageTitle(htmlResult.html);
      const analysis = await analyzeProject({ html: htmlResult.text, url: urlRaw, icpProfile: icp ?? null, userPlan });
      const scoring = await scoreProject({ analysis, icpProfile: icp ?? null, userPlan });
      const lead = scoreOpportunity({
        analysis,
        icp: icp ?? null,
        playbooks,
        sourceType,
        rawContext,
      });

      const created = await prisma.opportunity.create({
        data: {
          userId,
          url: urlToUse,
          sourceType,
          sourceLabel: sourceLabel || null,
          rawContext: rawContext || null,
          title: pageTitle || analysis.summary.slice(0, 120),
          tags: serializeJson(analysis.categoryTags),
          icpScore: scoring.score,
          mqaScore: analysis.mqaScore,
          bdAngles: serializeJson(analysis.bdAngles),
          leadScore: lead.leadScore,
          leadReasons: serializeJson(lead.leadReasons),
          signalStrength: lead.signalStrength,
          recencyScore: null,
          playbookMatches: serializeJson(lead.playbookMatches),
          icpProfileId: icp?.id,
        },
      });
      final.push(created);
    } catch (err) {
      const errorMessage = (err as Error).message;

      // Skip if duplicate was created in a race condition
      if (errorMessage.includes("Unique constraint") || errorMessage.includes("UNIQUE constraint")) {
        console.log("[lib/opportunity/createOpportunities] skipped duplicate (race condition)", urlRaw);
        skipped.push(urlRaw);
        continue;
      }

      console.error("[lib/opportunity/createOpportunities] failed", { url: urlRaw, message: errorMessage });
      // Fallback minimal record so radar still shows it
      try {
        const created = await prisma.opportunity.create({
          data: {
            userId,
            url: urlToUse,
            sourceType,
            sourceLabel: sourceLabel || null,
            rawContext: rawContext || null,
            title: urlToUse,
            status: "NEW",
          },
        });
        final.push(created);
      } catch (inner) {
        console.error("fallback create failed for", urlRaw, inner);
      }
    }
  }

  return { created: final, skipped, attempted: urls.length };
}
