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

      {/* Metrics row - more compact */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{total}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total leads</p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${hot > 0 ? "bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12] cursor-pointer" : "bg-white/[0.02]"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
            <span className="text-sm">🔥</span>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{hot}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Hot leads</p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${noNext > 0 ? "bg-amber-500/[0.08] hover:bg-amber-500/[0.12] cursor-pointer" : "bg-white/[0.02]"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/15">
            <span className="text-sm">⏰</span>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{noNext}</p>
            <p className="text-[10px] text-amber-400/70 uppercase tracking-wide">Unscheduled</p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${overdue > 0 ? "bg-rose-500/[0.08] hover:bg-rose-500/[0.12] cursor-pointer" : "bg-white/[0.02]"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-500/15">
            {overdue > 0 && <span className="absolute h-2 w-2 rounded-full bg-rose-400 animate-ping opacity-75" />}
            <span className="text-sm">⚠️</span>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{overdue}</p>
            <p className="text-[10px] text-rose-400/70 uppercase tracking-wide">Overdue</p>
          </div>
        </div>
      </div>

      {/* Board */}
      <Board projects={projectsWithMeta} />
    </div>
  );
}
