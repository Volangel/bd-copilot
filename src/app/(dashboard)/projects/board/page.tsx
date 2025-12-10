import Board from "@/components/projects/board";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
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
  const hot = projects.filter((p) => (p.icpScore ?? 0) >= 80).length;
  const noNext = projectsWithMeta.filter((p) => !p.nextSequenceStepDueAt).length;
  const overdue = projectsWithMeta.filter((p) => p.hasOverdueSequenceStep).length;

  return (
    <div className="min-h-screen">
      {/* Header section */}
      <div className="mb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Pipeline Board</h1>
              <p className="text-sm text-slate-500">Manage your leads across stages with drag-and-drop</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5 transition-all duration-200 hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total leads</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{total}</p>
              <p className="mt-1 text-xs text-slate-500">Across all stages</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/10 ring-1 ring-slate-500/20">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-5 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/80">Hot leads</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{hot}</p>
              <p className="mt-1 text-xs text-slate-500">ICP score 80+</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <span className="text-lg">🔥</span>
            </div>
          </div>
          {hot > 0 && (
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
          )}
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-5 transition-all duration-200 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-amber-400/80">Unscheduled</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{noNext}</p>
              <p className="mt-1 text-xs text-slate-500">Missing next touch</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/30">
              <span className="text-lg">⏰</span>
            </div>
          </div>
          {noNext > 0 && (
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-amber-500/50 to-transparent" />
          )}
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-transparent p-5 transition-all duration-200 hover:border-rose-500/30 hover:shadow-lg hover:shadow-rose-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-rose-400/80">Overdue</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{overdue}</p>
              <p className="mt-1 text-xs text-slate-500">Needs attention</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 ring-1 ring-rose-500/30">
              <span className="text-lg">⚠️</span>
            </div>
          </div>
          {overdue > 0 && (
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-rose-500/50 to-transparent" />
          )}
        </div>
      </div>

      {/* Board */}
      <Board projects={projectsWithMeta} />
    </div>
  );
}
