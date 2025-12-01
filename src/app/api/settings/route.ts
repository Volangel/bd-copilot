import { authOptions } from "@/lib/auth";
import { serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const settingsSchema = z.object({
  industries: z.string().optional().nullable(),
  painPoints: z.string().optional().nullable(),
  filters: z.any().optional().nullable(),
  aiVoice: z.any().optional().nullable(),
  representingProject: z
    .object({
      name: z.string(),
      website: z.string().optional().nullable(),
      oneLiner: z.string().optional().nullable(),
      productCategory: z.string().optional().nullable(),
      primaryValueProp: z.string().optional().nullable(),
      idealCustomer: z.string().optional().nullable(),
      keyDifferentiators: z.string().optional().nullable(),
      toneGuidelines: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { industries, painPoints, filters, aiVoice, representingProject } = settingsSchema.parse(body);

    const repProject =
      representingProject && representingProject.name.trim().length > 0
        ? {
            ...representingProject,
            referenceAccounts:
              representingProject.referenceAccounts
                ?.filter((v) => typeof v === "string")
                .map((v) => v.trim())
                .filter(Boolean) ?? [],
          }
        : null;

    await prisma.iCPProfile.upsert({
      where: { userId: session.user.id },
      update: {
        industries: industries ?? undefined,
        painPoints: painPoints ?? undefined,
        filters: serializeJson(filters),
      },
      create: {
        userId: session.user.id,
        industries: industries ?? null,
        painPoints: painPoints ?? null,
        filters: serializeJson(filters),
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        aiVoice: serializeJson(aiVoice),
        representingProject: serializeJson(repProject),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Failed to update settings", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
