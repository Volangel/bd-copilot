import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const updateSchema = z.object({
  status: z.string().optional(),
  nextFollowUpAt: z.string().nullable().optional(),
  lastContactAt: z.string().nullable().optional(),
  name: z.string().max(200).optional(),
  stage: z.string().max(200).optional(),
  targetUsers: z.string().optional().nullable(),
  painPoints: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  categoryTags: z.array(z.string()).optional(),
  twitter: z.string().optional().nullable(),
  telegram: z.string().optional().nullable(),
  discord: z.string().optional().nullable(),
  github: z.string().optional().nullable(),
  medium: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { status, nextFollowUpAt, lastContactAt, name, stage, targetUsers, painPoints, summary, categoryTags, twitter, telegram, discord, github, medium } =
      updateSchema.parse(body);

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: status ?? project.status,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        lastContactAt: lastContactAt ? new Date(lastContactAt) : project.lastContactAt,
        name: name ?? project.name,
        stage: stage ?? project.stage,
        targetUsers: targetUsers ?? project.targetUsers,
        painPoints: painPoints ?? project.painPoints,
        summary: summary ?? project.summary,
        categoryTags: categoryTags ? JSON.stringify(categoryTags) : project.categoryTags,
        twitter: twitter ?? project.twitter,
        telegram: telegram ?? project.telegram,
        discord: discord ?? project.discord,
        github: github ?? project.github,
        medium: medium ?? project.medium,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Failed to update project", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
