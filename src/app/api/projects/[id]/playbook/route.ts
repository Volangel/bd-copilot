import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAccountPlaybookDraft } from "@/lib/ai/accountPlaybook";
import { parseJsonString } from "@/lib/parsers";
import { parseRepresentingProjectConfig } from "@/lib/user/types";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const icpProfile = await prisma.iCPProfile.findUnique({ where: { userId: session.user.id } });

    if (!project.summary) {
      return NextResponse.json({ error: "Project needs analysis before playbook" }, { status: 400 });
    }

    const analysis = {
      summary: project.summary || "",
      categoryTags: parseJsonString<string[]>(project.categoryTags, []),
      stage: project.stage || null,
      targetUsers: project.targetUsers,
      painPoints: project.painPoints,
      bdAngles: parseJsonString<string[]>(project.bdAngles, []),
      mqaScore: project.mqaScore,
      mqaReasons: parseJsonString<string[]>(project.mqaReasons, []),
    };

    const playbook = await generateAccountPlaybookDraft({
      analysis,
      icpProfile: icpProfile
        ? {
            industries: icpProfile.industries,
            painPoints: icpProfile.painPoints,
            filters: parseJsonString<Record<string, unknown>>(icpProfile.filters, null),
          }
        : null,
      representingProject: user ? parseRepresentingProjectConfig(user.representingProject) : null,
      userPlan: user?.plan ?? "free",
    });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        playbookSummary: playbook.summary,
        playbookPersonas: JSON.stringify(playbook.recommendedPersonas),
        playbookAngles: JSON.stringify(playbook.primaryAngles),
      },
    });

    return NextResponse.json({ project: updated, playbook });
  } catch (err) {
    console.error("[api/projects/[id]/playbook] error", err);
    return NextResponse.json({ error: "Failed to generate playbook" }, { status: 500 });
  }
}
