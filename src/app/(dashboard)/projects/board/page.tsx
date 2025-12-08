import Board from "@/components/projects/board";
import { authOptions } from "@/lib/auth";
import { PROJECT_STATUSES } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import { Card, MetricCard } from "@/components/ui/card";
import { buildStepMeta } from "@/lib/pipeline/stepMeta";

export default async function ProjectBoardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const pendingSteps = await prisma.sequenceStep.findMany({
    where: { status: "PENDING", sequence: { userId: session.user.id, projectId: { in: projects.map((p) => p.id) } } },
    include: { sequence: true },
  });
  const meta = buildStepMeta(
    pendingSteps.map((s) => ({ scheduledAt: s.scheduledAt, sequence: { projectId: s.sequence.projectId } })),
    projects.map((p) => p.id),
  );
  const projectsWithMeta = projects.map((p) => ({
    ...p,
    nextSequenceStepDueAt: meta.get(p.id)?.nextSequenceStepDueAt || null,
    hasOverdueSequenceStep: meta.get(p.id)?.hasOverdueSequenceStep || false,
  }));

  const total = projects.length;
  const hot = projects.filter((p) => (p.icpScore ?? 0) > 80).length;
  const noNext = projectsWithMeta.filter((p) => !p.nextSequenceStepDueAt).length;

  return (
    <div className="flex flex-col gap-8 px-8 py-10 md:py-12 lg:px-10 xl:max-w-6xl xl:mx-auto">
      <PageHeader
        title="Pipeline Board"
        description="Drag cards between columns or use the dropdown to update status. Designed to keep momentum without sacrificing clarity."
        mode="pipeline"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total projects" value={total} helper="Across all lanes" />
        <MetricCard title="Hot (ICP > 80)" value={hot} helper="High-priority accounts" />
        <MetricCard title="Missing next touch" value={noNext} helper="Add next touch to avoid stalling" />
      </div>
      <Card className="relative overflow-hidden rounded-2xl border border-emerald-500/10 bg-gradient-to-r from-[#0B2E27] via-[#0F1012] to-[#10131A] px-8 py-6 text-sm text-slate-200 shadow-lg shadow-emerald-500/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(6,182,212,0.08),transparent_30%)]" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Premium board experience</p>
            <p className="mt-1 text-lg font-semibold text-white">Orchestrate every lane with confidence</p>
            <p className="text-sm text-slate-300">Curated filters, inline status updates, and guided tips keep the board fast and precise.</p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-slate-200">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-100 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live drag + drop feedback
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 font-semibold text-cyan-100 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> Smart filters for hot + overdue deals
            </span>
          </div>
        </div>
      </Card>
      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-4 text-xs text-slate-300 shadow-lg shadow-black/20">
        Statuses: {PROJECT_STATUSES.join(" · ")} · Tip: click a card to open the project.
      </Card>
      <Board projects={projectsWithMeta} />
    </div>
  );
}
