import { authOptions } from "@/lib/auth";
import {
  collectTeamPages,
  enrichSnippetsWithSocials,
  extractContactCandidatesFromSnippets,
  extractPersonSnippetsFromPages,
} from "@/lib/contacts/deepContactDiscovery";
import { autoDetectContacts } from "@/lib/contact-workbench/autoDetectContacts";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!project.url) return NextResponse.json({ error: "Project has no URL" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const userPlan = user?.plan ?? "free";

    const pages = await collectTeamPages({ projectUrl: project.url, userPlan });
    if (!pages.pages.length) {
      return NextResponse.json({ error: "No team-like pages found to scan" }, { status: 400 });
    }
    const snippets = extractPersonSnippetsFromPages(pages.pages);
    const enrichedSnippets = enrichSnippetsWithSocials(snippets);
    const aiCandidates = await extractContactCandidatesFromSnippets({
      projectUrl: project.url,
      projectName: project.name,
      snippets: enrichedSnippets,
      userPlan,
    });
    const heuristicContacts = (await autoDetectContacts(project.url)).map((c) => ({
      name: c.name || "",
      role: c.role || null,
      linkedinUrl: c.linkedinUrl || null,
      twitterHandle: c.twitterHandle || null,
      telegram: c.telegram || null,
      email: c.email || null,
      sourceUrl: project.url,
      tags: [],
      sourceType: "heuristic" as const,
    }));

    const merged = [...aiCandidates, ...heuristicContacts].filter((c) => c.name.trim().length > 0);
    const seen = new Set<string>();
    const dedup = merged.filter((c) => {
      const key = `${c.name.toLowerCase()}-${(c.role || "").toLowerCase()}-${(c.linkedinUrl || "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ candidates: dedup });
  } catch (err) {
    console.error("[api/projects/[id]/contacts/deep-discover] error", err);
    return NextResponse.json({ error: "Failed to discover contacts" }, { status: 500 });
  }
}
