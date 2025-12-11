import { FocusPanel } from "@/components/projects/focus-panel";
import { FilterBar } from "@/components/projects/filter-bar";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import { ProjectsTable } from "@/components/projects/projects-table";
import { StatChips } from "@/components/projects/stat-chips";
import { authOptions } from "@/lib/auth";
import { PROJECT_STATUSES } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { sortProjectsByPriority } from "@/lib/pipeline/priority";
import { buildStepMeta } from "@/lib/pipeline/stepMeta";
import { PageHeader } from "@/components/ui/header";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const params = searchParams || {};
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const q = typeof params?.q === "string" ? params.q : "";
  const statusesRaw = params?.status;
  const statusList = Array.isArray(statusesRaw)
    ? statusesRaw
    : typeof statusesRaw === "string"
      ? statusesRaw.split(",").filter(Boolean)
      : [];
  const parsedICP = typeof params?.minICP === "string" ? Number(params.minICP) : undefined;
  const parsedMQA = typeof params?.minMQA === "string" ? Number(params.minMQA) : undefined;
  const minICP = Number.isFinite(parsedICP) ? (parsedICP as number) : undefined;
  const minMQA = Number.isFinite(parsedMQA) ? (parsedMQA as number) : undefined;

  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { url: { contains: q, mode: "insensitive" } },
              { categoryTags: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(statusList.length > 0 ? { status: { in: statusList } } : {}),
      ...(minICP !== undefined ? { icpScore: { gte: minICP } } : {}),
      ...(minMQA !== undefined ? { mqaScore: { gte: minMQA } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get all projects for stats (without filters)
  const allProjects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, icpScore: true, status: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Run sequence metadata queries in parallel for better performance
  const projectIds = projects.map((p) => p.id);
  const allProjectIds = allProjects.map((p) => p.id);

  const [projectSequenceCounts, pendingSteps, allPendingSteps] = await Promise.all([
    prisma.sequence.groupBy({
      by: ["projectId"],
      _count: { id: true },
      where: { projectId: { in: projectIds } },
    }),
    prisma.sequenceStep.findMany({
      where: { status: "PENDING", sequence: { projectId: { in: projectIds }, userId: session.user.id } },
      include: { sequence: true },
      orderBy: { scheduledAt: "asc" },
    }),
    // For stats - get all pending steps
    prisma.sequenceStep.findMany({
      where: { status: "PENDING", sequence: { projectId: { in: allProjectIds }, userId: session.user.id } },
      include: { sequence: true },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const sequenceMap = Object.fromEntries(projectSequenceCounts.map((g) => [g.projectId, g._count.id]));
  const metaMap = buildStepMeta(
    pendingSteps.map((s) => ({ scheduledAt: s.scheduledAt, sequence: { projectId: s.sequence.projectId } })),
    projects.map((p) => p.id),
  );

  // Build meta map for all projects (for stats)
  const allMetaMap = buildStepMeta(
    allPendingSteps.map((s) => ({ scheduledAt: s.scheduledAt, sequence: { projectId: s.sequence.projectId } })),
    allProjectIds,
  );

  const projectsWithMeta = projects.map((p) => {
    const meta = metaMap.get(p.id);
    return {
      id: p.id,
      name: p.name ?? null,
      url: p.url,
      status: p.status,
      icpScore: p.icpScore ?? null,
      mqaScore: p.mqaScore ?? null,
      updatedAt: new Date(p.updatedAt),
      nextSequenceStepDueAt: meta?.nextSequenceStepDueAt || null,
      hasOverdueSequenceStep: meta?.hasOverdueSequenceStep || false,
      overdueCount: meta?.overdueCount || 0,
    };
  });

  // Calculate stats from all projects (unfiltered)
  const allProjectsWithMeta = allProjects.map((p) => {
    const meta = allMetaMap.get(p.id);
    return {
      ...p,
      nextSequenceStepDueAt: meta?.nextSequenceStepDueAt || null,
      hasOverdueSequenceStep: meta?.hasOverdueSequenceStep || false,
    };
  });

  const actionable = projectsWithMeta.filter((p) => p.status !== "WON" && p.status !== "LOST");
  const overdue = actionable.filter((p) => p.nextSequenceStepDueAt && p.nextSequenceStepDueAt < today);
  const dueToday = actionable.filter((p) => p.nextSequenceStepDueAt && p.nextSequenceStepDueAt >= today && p.nextSequenceStepDueAt < endOfToday);

  // Stats from all projects
  const allActionable = allProjectsWithMeta.filter((p) => p.status !== "WON" && p.status !== "LOST");
  const allOverdue = allActionable.filter((p) => p.nextSequenceStepDueAt && p.nextSequenceStepDueAt < today);
  const allDueToday = allActionable.filter((p) => p.nextSequenceStepDueAt && p.nextSequenceStepDueAt >= today && p.nextSequenceStepDueAt < endOfToday);
  const highIcpCount = allProjects.filter((p) => p.icpScore && p.icpScore >= 70).length;
  const needsActionCount = allProjects.filter((p) => p.status === "NOT_CONTACTED" || p.status === "WAITING_REPLY").length;

  const sortedProjects = sortProjectsByPriority(projectsWithMeta);

  // Prepare focus panel data
  const focusOverdue = overdue.map((p) => ({
    id: p.id,
    name: p.name,
    url: p.url,
    status: p.status,
    nextSequenceStepDueAt: p.nextSequenceStepDueAt,
    sequenceCount: sequenceMap[p.id] || 0,
  }));

  const focusDueToday = dueToday.map((p) => ({
    id: p.id,
    name: p.name,
    url: p.url,
    status: p.status,
    nextSequenceStepDueAt: p.nextSequenceStepDueAt,
    sequenceCount: sequenceMap[p.id] || 0,
  }));

  // Prepare table data
  const tableProjects = sortedProjects.map((p) => ({
    id: p.id,
    name: p.name,
    url: p.url,
    status: p.status || "NOT_CONTACTED",
    icpScore: p.icpScore,
    mqaScore: p.mqaScore,
    updatedAt: p.updatedAt,
    nextSequenceStepDueAt: p.nextSequenceStepDueAt,
    hasOverdueSequenceStep: p.hasOverdueSequenceStep,
    overdueCount: p.overdueCount || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeader
            title="Accounts"
            description="Monitor ICP fit, outreach, and follow-ups across your pipeline."
            mode="pipeline"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/projects/board"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Board
          </Link>
          <Link
            href="/projects/import"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Link>
          <Link
            href="/templates"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Templates
          </Link>
          <NewProjectModal />
        </div>
      </div>

      {/* Stats Chips */}
      <StatChips
        total={allProjects.length}
        overdue={allOverdue.length}
        dueToday={allDueToday.length}
        highIcp={highIcpCount}
        needsAction={needsActionCount}
      />

      {/* Focus Panel - Overdue & Today */}
      <FocusPanel overdue={focusOverdue} dueToday={focusDueToday} />

      {/* Filter Bar */}
      <FilterBar
        totalCount={projects.length}
        currentQuery={q}
        currentStatuses={statusList}
        currentMinICP={minICP}
        currentMinMQA={minMQA}
      />

      {/* Main Table or Empty State */}
      {allProjects.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Start by adding a protocol or converting an opportunity from the Discover section."
          icon="📁"
          primaryAction={{ label: "Add your first account", href: "#" }}
          secondaryAction={{ label: "Discover opportunities", href: "/discover" }}
        />
      ) : sortedProjects.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-16 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300">No matching accounts</p>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filters</p>
          <Link
            href="/projects"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </Link>
        </div>
      ) : (
        <ProjectsTable projects={tableProjects} sequenceMap={sequenceMap} />
      )}
    </div>
  );
}
