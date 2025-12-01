import { analyzeProject, scoreProject } from "@/lib/ai/aiService";
import { serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { extractPageTitle } from "@/lib/discovery/pageTitle";

export async function convertOpportunityToProject({ opportunityId, userId }: { opportunityId: string; userId: string }) {
  const opportunity = await prisma.opportunity.findFirst({ where: { id: opportunityId, userId } });
  if (!opportunity) throw new Error("Opportunity not found");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const userPlan = user?.plan ?? "free";

  if (opportunity.projectId) {
    return prisma.project.findUnique({ where: { id: opportunity.projectId } });
  }

  // Deduplicate by URL per user
  const existingByUrl = await prisma.project.findFirst({ where: { userId, url: opportunity.url } });
  if (existingByUrl) {
    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: { status: "CONVERTED", projectId: existingByUrl.id },
    });
    return existingByUrl;
  }

  try {
    const htmlResult = await fetchHtml(opportunity.url);
    const pageTitle = extractPageTitle(htmlResult.html);
    const icp = await prisma.iCPProfile.findUnique({ where: { userId } });
    const analysis = await analyzeProject({ html: htmlResult.text, url: opportunity.url, icpProfile: icp ?? null, userPlan });
    const scoring = await scoreProject({ analysis, icpProfile: icp ?? null, userPlan });

    const project = await prisma.project.create({
      data: {
        userId,
        url: opportunity.url,
        name: pageTitle || opportunity.title || analysis.summary.slice(0, 80),
        summary: analysis.summary,
        categoryTags: serializeJson(analysis.categoryTags),
        stage: analysis.stage,
        targetUsers: analysis.targetUsers,
        painPoints: analysis.painPoints,
        icpScore: scoring.score,
        icpExplanation: scoring.explanation,
        bdAngles: serializeJson(analysis.bdAngles),
        mqaScore: analysis.mqaScore,
        mqaReasons: analysis.mqaReasons,
      },
    });

    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: { status: "CONVERTED", projectId: project.id },
    });

    return project;
  } catch (err) {
    console.error("[lib/discovery/convertOpportunityToProject] fallback", { message: (err as Error).message });
    // Fallback: create a minimal project entry so the user can still progress
    const project = await prisma.project.create({
      data: {
        userId,
        url: opportunity.url,
        name: opportunity.title || opportunity.url,
        summary: opportunity.rawContext || "Imported from opportunity",
        categoryTags: opportunity.tags,
        bdAngles: opportunity.bdAngles,
        mqaScore: opportunity.mqaScore,
        icpScore: opportunity.icpScore,
      },
    });

    await prisma.opportunity.update({
      where: { id: opportunity.id },
      data: { status: "CONVERTED", projectId: project.id },
    });

    return project;
  }
}
