import { analyzeProject, scoreProject } from "@/lib/ai/aiService";
import { mockAnalyzeProject, mockScoreProject } from "@/lib/ai/mocks";
import { serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { parseRepresentingProjectConfig } from "@/lib/user/types";

interface EnrichExistingProjectOptions {
  projectId: string;
  userId: string;
}

export async function enrichExistingProjectFromUrl(options: EnrichExistingProjectOptions) {
  const { projectId, userId } = options;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { user: true },
  });
  if (!project) throw new Error("Project not found or not owned by user");
  if (!project.url) throw new Error("Project has no URL to enrich from");

  const user = project.user;
  const userPlan = user.plan ?? "free";
  const icp = await prisma.iCPProfile.findUnique({ where: { userId } });
  const representingProject = parseRepresentingProjectConfig(user.representingProject);

  const htmlResult = await fetchHtml(project.url).catch((err) => {
    console.error("[enrichProject] fetch failed, using empty text", { message: (err as Error).message });
    return { html: "", text: "" };
  });

  let analysis;
  try {
    analysis = await analyzeProject({
      html: htmlResult.text,
      url: project.url,
      icpProfile: icp ?? null,
      userPlan,
      representingProject,
    });
  } catch (err) {
    console.error("[enrichProject] analyze fallback", { message: (err as Error).message });
    analysis = mockAnalyzeProject({ html: htmlResult.text, url: project.url, icpProfile: icp ?? null, userPlan, representingProject });
  }

  let scoring;
  try {
    scoring = await scoreProject({ analysis, icpProfile: icp ?? null, userPlan, representingProject });
  } catch (err) {
    console.error("[enrichProject] score fallback", { message: (err as Error).message });
    scoring = mockScoreProject({ analysis, icpProfile: icp ?? null, userPlan, representingProject });
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
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

  return { project: updated, analysis, score: scoring };
}
