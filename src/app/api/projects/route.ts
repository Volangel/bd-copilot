import { authOptions } from "@/lib/auth";
import { analyzeProject, scoreProject } from "@/lib/ai/aiService";
import { mockAnalyzeProject, mockScoreProject } from "@/lib/ai/mocks";
import { serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { parseRepresentingProjectConfig } from "@/lib/user/types";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { fetchMetadata } from "@/lib/scraper/fetchMetadata";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const projectSchema = z.object({
  url: z.string().url(),
  name: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 50)) : 50;
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, name: true, url: true, status: true },
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const { url, name } = projectSchema.parse(body);

    // Deduplicate by URL per user
    const existing = await prisma.project.findFirst({ where: { userId: session.user.id, url } });
    if (existing) {
      return NextResponse.json(
        { error: "Project with this URL already exists", existingId: existing.id },
        { status: 409 }
      );
    }

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

    const htmlResult = await fetchHtml(url).catch((err) => {
      console.error("[api/projects] fetch failed, falling back to mock text", { message: (err as Error).message });
      return { html: "", text: "Could not fetch site; using mock content for analysis." };
    });

    const icp = await prisma.iCPProfile.findUnique({ where: { userId: session.user.id } });

    let analysis;
    try {
      analysis = await analyzeProject({ html: htmlResult.text, url, icpProfile: icp ?? null, userPlan, representingProject });
    } catch (err) {
      console.error("[api/projects] analyze fallback", { message: (err as Error).message });
      analysis = mockAnalyzeProject({ html: htmlResult.text, url, icpProfile: icp ?? null, userPlan, representingProject });
    }

    let scoring;
    try {
      scoring = await scoreProject({ analysis, icpProfile: icp ?? null, userPlan, representingProject });
    } catch (err) {
      console.error("[api/projects] score fallback", { message: (err as Error).message });
      scoring = mockScoreProject({ analysis, icpProfile: icp ?? null, userPlan, representingProject });
    }

    let socials = { twitter: null, telegram: null, discord: null, github: null, medium: null };
    try {
      socials = fetchMetadata(url, htmlResult.html);
    } catch (err) {
      console.error("[api/projects] metadata fallback", { message: (err as Error).message });
    }

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: name || null,
        url,
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
        twitter: socials.twitter || null,
        telegram: socials.telegram || null,
        discord: socials.discord || null,
        github: socials.github || null,
        medium: socials.medium || null,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("[api/projects] error", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
