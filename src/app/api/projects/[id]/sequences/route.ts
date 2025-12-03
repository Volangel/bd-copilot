import { authOptions } from "@/lib/auth";
import { generateSequenceSteps } from "@/lib/ai/aiService";
import { prisma } from "@/lib/prisma";
import { parseJsonString } from "@/lib/parsers";
import { parseRepresentingProjectConfig } from "@/lib/user/types";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const schema = z.object({
  contactId: z.string(),
  touches: z.number().min(3).max(4).optional(),
  playbookId: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = params;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const userPlan = user?.plan ?? "free";
  const representingProjectBase = parseRepresentingProjectConfig(user?.representingProject);
  const wonProjects = await prisma.project.findMany({
    where: { userId: session.user.id, status: "WON" },
    select: { name: true, url: true },
    take: 5,
  });
  const wonRefs = wonProjects.map((p) => p.name || p.url).filter(Boolean) as string[];
  const representingProject = representingProjectBase
    ? {
        ...representingProjectBase,
        referenceAccounts: Array.from(
          new Set([...(representingProjectBase.referenceAccounts || []), ...wonRefs]),
        ),
      }
    : null;

  try {
    const body = await request.json();
    const { contactId, touches, playbookId } = schema.parse(body);

    const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const contact = await prisma.contact.findFirst({ where: { id: contactId, projectId: id } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

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

    const playbook = playbookId ? await prisma.playbook.findFirst({ where: { id: playbookId, userId: session.user.id } }) : null;
    const playbookAngles = parseJsonString<string[]>(project.playbookAngles, []);
    const persona =
      contact.persona ||
      (contact.role && /founder|ceo|cto|co[- ]founder/i.test(contact.role)
        ? "Technical founder"
        : contact.role && /engineer|developer|dev|protocol/i.test(contact.role)
          ? "Protocol engineer"
          : contact.role && /bd|business|growth|ecosystem/i.test(contact.role)
            ? "BD / ecosystem lead"
            : undefined);
    const primaryAngle = playbookAngles[0] || (Array.isArray(analysis.bdAngles) ? analysis.bdAngles[0] : undefined);
    const seq = await generateSequenceSteps({
      analysis,
      contact: { name: contact.name, role: contact.role, channelPreference: contact.channelPreference },
      playbook: playbook ? { name: playbook.name, boosts: playbook.boosts, penalties: playbook.penalties } : null,
      touches,
      userPlan,
      representingProject,
      primaryAngle,
      persona,
    });

    const sequence = await prisma.sequence.create({
      data: {
        userId: session.user.id,
        projectId: id,
        contactId,
        playbookId: playbookId || null,
        steps: {
          create: seq.steps.map((s, idx) => ({
            stepNumber: idx + 1,
            channel: s.channel,
            content: s.contentHint || s.objective || "",
            status: "PENDING",
            scheduledAt: (() => {
              const baseDate = new Date();
              baseDate.setHours(9, 0, 0, 0); // Schedule for 9 AM today
              const offsetMs = (s.offsetDays ?? 0) * 24 * 60 * 60 * 1000;
              return new Date(baseDate.getTime() + offsetMs);
            })(),
          })),
        },
      },
      include: { steps: true },
    });

    return NextResponse.json(sequence);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/projects/[id]/sequences] error", {
      userId: session.user.id,
      projectId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to create sequence" }, { status: 500 });
  }
}
