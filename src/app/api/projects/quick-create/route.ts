import { authOptions } from "@/lib/auth";
import { analyzeProject, scoreProject } from "@/lib/ai/aiService";
import { serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { parseRepresentingProjectConfig } from "@/lib/user/types";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { fetchMetadata } from "@/lib/scraper/fetchMetadata";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const schema = z.object({ url: z.string().url() });

// Whitelist of allowed origins for CORS
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "https://localhost:3000",
].filter(Boolean) as string[];

const corsHeaders = (origin: string | null) => {
  // Only allow whitelisted origins with strict equality check
  // Avoid endsWith() to prevent subdomain bypass attacks (e.g., evil.com.localhost:3000)
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] || "null";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const origin = request.headers.get("origin");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
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
    const { url } = schema.parse(body);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400, headers: corsHeaders(origin) });
    }
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.includes("linkedin.com") && (path.includes("/in/") || path.includes("/people/"))) {
      return NextResponse.json(
        { error: "That looks like a person profile. Use Quick Capture → Contacts instead of Projects." },
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    const htmlResult = await fetchHtml(url).catch((err) => {
      console.error("[api/projects/quick-create] fetch failed", { message: (err as Error).message });
      return { html: "", text: "Could not fetch site; using mock content for analysis." };
    });

    const icp = await prisma.iCPProfile.findUnique({ where: { userId: session.user.id } });
    const analysis = await analyzeProject({ html: htmlResult.text, url, icpProfile: icp ?? null, userPlan, representingProject });
    const scoring = await scoreProject({ analysis, icpProfile: icp ?? null, userPlan, representingProject });
    const socials = fetchMetadata(url, htmlResult.html);

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
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

    return NextResponse.json({ id: project.id }, { headers: corsHeaders(origin) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid payload" }, { status: 400, headers: corsHeaders(origin) });
    }
    console.error("[api/projects/quick-create] error", error);
    return NextResponse.json({ error: "Failed to quick create" }, { status: 500, headers: corsHeaders(origin) });
  }
}
