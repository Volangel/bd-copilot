import { authOptions } from "@/lib/auth";
import { analyzeProject, scoreProject } from "@/lib/ai/aiService";
import { serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { parseRepresentingProjectConfig } from "@/lib/user/types";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { fetchMetadata } from "@/lib/scraper/fetchMetadata";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { parse } from "csv-parse/sync";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing CSV file" }, { status: 400 });
    }

    const text = await file.text();
    const records: { url?: string; name?: string }[] = parse(text, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });

    const limited = records.slice(0, 50);
    let success = 0;
    let skipped = 0;

    const icp = await prisma.iCPProfile.findUnique({ where: { userId: session.user.id } });

    for (const row of limited) {
      const url = row.url?.trim();
      if (!url) {
        skipped += 1;
        continue;
      }

      // Check for existing project with this URL
      const existing = await prisma.project.findFirst({
        where: { userId: session.user.id, url },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      try {
        const htmlResult = await fetchHtml(url).catch((fetchErr) => {
          console.error("[api/projects/import] fetch failed", { message: (fetchErr as Error).message });
          return { html: "", text: "Could not fetch site; using mock content for analysis." };
        });
        const analysis = await analyzeProject({
          html: htmlResult.text,
          url,
          icpProfile: icp ?? null,
          userPlan,
          representingProject,
        });
        const scoring = await scoreProject({ analysis, icpProfile: icp ?? null, userPlan, representingProject });
        const socials = fetchMetadata(url, htmlResult.html);

        await prisma.project.create({
          data: {
            userId: session.user.id,
            name: row.name || null,
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
        success += 1;
      } catch (err) {
        console.error("[api/projects/import] row failed", { url, message: (err as Error).message });
        skipped += 1;
      }
    }

    return NextResponse.json({ success, skipped });
  } catch (error) {
    console.error("[api/projects/import] error", error);
    return NextResponse.json({ error: "Failed to import" }, { status: 500 });
  }
}
