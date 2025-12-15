import { analyzeProject, generateSequenceSteps, scoreProject } from "@/lib/ai/aiService";
import { serializeJson, parseJsonString } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { extractPageTitle } from "@/lib/discovery/pageTitle";

// Inline types to avoid Prisma import issues
type Opportunity = {
  id: string;
  userId: string;
  sourceType: string;
  sourceLabel: string | null;
  rawContext: string | null;
  url: string;
  title: string | null;
  tags: string | null;
  icpScore: number | null;
  mqaScore: number | null;
  bdAngles: string | null;
  leadScore: number | null;
  leadReasons: string | null;
  signalStrength: number | null;
  recencyScore: number | null;
  playbookMatches: string | null;
  icpProfileId: string | null;
  nextReviewAt: Date | null;
  status: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Project = {
  id: string;
  userId: string;
  name: string | null;
  url: string;
  summary: string | null;
  categoryTags: string | null;
  stage: string | null;
  targetUsers: string | null;
  painPoints: string | null;
  icpScore: number | null;
  icpExplanation: string | null;
  bdAngles: string | null;
  mqaScore: number | null;
  mqaReasons: string | null;
  playbookSummary: string | null;
  playbookPersonas: string | null;
  playbookAngles: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  github: string | null;
  medium: string | null;
  status: string;
  lastContactAt: Date | null;
  nextFollowUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function seedEngagement({
  project,
  opportunity,
  userId,
  userPlan,
}: {
  project: Project;
  opportunity: Opportunity;
  userId: string;
  userPlan: string;
}) {
  try {
    const existingSequence = await prisma.sequence.findFirst({ where: { projectId: project.id } });
    if (existingSequence) return;

    const playbookMatches = parseJsonString<string[]>(opportunity.playbookMatches, []);
    const playbook = playbookMatches.length
      ? await prisma.playbook.findFirst({ where: { userId, name: playbookMatches[0] } })
      : null;

    const contact =
      (await prisma.contact.findFirst({ where: { projectId: project.id } })) ||
      (await prisma.contact.create({
        data: {
          projectId: project.id,
          name: project.name || project.url,
          role: "Point of contact",
        },
      }));

    const analysis = {
      summary: project.summary || project.url,
      categoryTags: parseJsonString<string[]>(project.categoryTags, []),
      stage: project.stage || "unknown",
      targetUsers: project.targetUsers || "",
      painPoints: project.painPoints || "",
      bdAngles: parseJsonString<string[]>(project.bdAngles, []),
      mqaScore: project.mqaScore || 0,
      mqaReasons: project.mqaReasons || "",
    };

    const primaryAngle = parseJsonString<string[]>(project.playbookAngles, [])[0] || analysis.bdAngles[0];
    const seq = await generateSequenceSteps({
      analysis,
      contact: { name: contact.name, role: contact.role, channelPreference: contact.channelPreference },
      playbook: playbook ? { name: playbook.name, boosts: playbook.boosts, penalties: playbook.penalties } : null,
      touches: 3,
      userPlan,
      primaryAngle,
      persona: contact.persona || undefined,
    });

    const sequence = await prisma.sequence.create({
      data: {
        userId,
        projectId: project.id,
        contactId: contact.id,
        playbookId: playbook?.id || null,
        steps: {
          create: seq.steps.map((s, idx) => ({
            stepNumber: idx + 1,
            channel: s.channel,
            content: s.contentHint || s.objective || "",
            status: "PENDING",
            scheduledAt: (() => {
              const baseDate = new Date();
              baseDate.setHours(9, 0, 0, 0);
              const offsetMs = (s.offsetDays ?? 0) * 24 * 60 * 60 * 1000;
              return new Date(baseDate.getTime() + offsetMs);
            })(),
          })),
        },
      },
      include: { steps: true },
    });

    type SequenceStepType = (typeof sequence.steps)[number];
    const nextPending = sequence.steps.find((s: SequenceStepType) => s.status === "PENDING" && s.scheduledAt);
    if (nextPending?.scheduledAt) {
      await prisma.project.update({
        where: { id: project.id },
        data: { nextFollowUpAt: nextPending.scheduledAt },
      });
    }
  } catch (err) {
    console.error("[convertOpportunityToProject] seed engagement failed", {
      projectId: project.id,
      opportunityId: opportunity.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

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

    await seedEngagement({ project, opportunity, userId, userPlan });

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

    await seedEngagement({ project, opportunity, userId, userPlan });

    return project;
  }
}
