import { authOptions } from "@/lib/auth";
import { generateOutreach } from "@/lib/ai/aiService";
import { ProjectAnalysisResult } from "@/lib/ai/types";
import { parseJsonString } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { parseRepresentingProjectConfig } from "@/lib/user/types";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const generateSchema = z.object({
  projectId: z.string(),
  contactId: z.string(),
  channels: z.array(z.string()),
  customContent: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { projectId, contactId, channels, customContent } = generateSchema.parse(body);

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { user: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const contact = await prisma.contact.findFirst({ where: { id: contactId, projectId } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const voiceProfile = parseJsonString<{ tone?: string; length?: string; formality?: string } | null>(
      project.user.aiVoice,
      null,
    );

    const analysis: ProjectAnalysisResult = {
      summary: project.summary || "",
      categoryTags: parseJsonString<string[]>(project.categoryTags, []),
      stage: project.stage || "early",
      targetUsers: project.targetUsers || "",
      painPoints: project.painPoints || "",
    };

    const userPlan = project.user.plan || "free";
    const representingProjectBase = parseRepresentingProjectConfig(project.user.representingProject);
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
    const primaryAngle = playbookAngles[0] || parseJsonString<string[]>(project.bdAngles, [])[0];
    const messages = customContent
      ? Object.fromEntries(channels.map((channel) => [channel, customContent]))
      : await generateOutreach({
          analysis,
          contact,
          voiceProfile,
          channels,
          icpProfile: null,
          userPlan,
          representingProject,
          persona,
          primaryAngle,
        });

    const createdMessages = await Promise.all(
      Object.entries(messages).map(([channel, content]) =>
        prisma.outreachMessage.create({
          data: {
            projectId,
            contactId,
            channel,
            content,
          },
        }),
      ),
    );

    await prisma.project.update({
      where: { id: projectId, userId: session.user.id },
      data: { lastContactAt: new Date() },
    });

    await prisma.note.create({
      data: {
        projectId,
        content: `Generated outreach for ${contact.name} on channels: ${channels.join(", ")}`,
      },
    });

    return NextResponse.json(createdMessages);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("[api/outreach/generate] error", error);
    return NextResponse.json({ error: "Failed to generate outreach" }, { status: 500 });
  }
}
