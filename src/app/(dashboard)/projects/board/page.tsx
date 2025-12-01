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
      <PageHeader title="Pipeline Board" description="Drag cards between columns or use the dropdown to update status." mode="pipeline" />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total projects" value={total} helper="Across all lanes" />
        <MetricCard title="Hot (ICP > 80)" value={hot} helper="High-priority accounts" />
        <MetricCard title="Missing next touch" value={noNext} helper="Add next touch to avoid stalling" />
      </div>
      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-4 text-xs text-slate-300 shadow-lg shadow-black/20">
        Statuses: {PROJECT_STATUSES.join(" · ")} · Tip: click a card to open the project.
      </Card>
      <Board projects={projectsWithMeta} />
    </div>
  );
}
