import { NewProjectForm } from "@/components/projects/new-project-form";
import { authOptions } from "@/lib/auth";
import { formatDate, PROJECT_STATUSES } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { sortProjectsByPriority } from "@/lib/pipeline/priority";
import { buildStepMeta } from "@/lib/pipeline/stepMeta";
import { PageHeader } from "@/components/ui/header";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Run sequence metadata queries in parallel for better performance
  const projectIds = projects.map((p) => p.id);
  const [projectSequenceCounts, pendingSteps] = await Promise.all([
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
  ]);

  const sequenceMap = Object.fromEntries(projectSequenceCounts.map((g) => [g.projectId, g._count.id]));
  const metaMap = buildStepMeta(
    pendingSteps.map((s) => ({ scheduledAt: s.scheduledAt, sequence: { projectId: s.sequence.projectId } })),
    projects.map((p) => p.id),
  );

  const projectsWithMeta = projects.map((p) => {
    const meta = metaMap.get(p.id);
    return {
      ...p,
      nextSequenceStepDueAt: meta?.nextSequenceStepDueAt || null,
      hasOverdueSequenceStep: meta?.hasOverdueSequenceStep || false,
      overdueCount: meta?.overdueCount || 0,
    };
  });

  const actionable = projectsWithMeta.filter((p) => p.status !== "WON" && p.status !== "LOST");
  const overdue = actionable.filter((p) => p.nextSequenceStepDueAt && p.nextSequenceStepDueAt < today);
  const dueToday = actionable.filter((p) => p.nextSequenceStepDueAt && p.nextSequenceStepDueAt >= today && p.nextSequenceStepDueAt < endOfToday);

  const sortedProjects = sortProjectsByPriority(
    projectsWithMeta.map((p) => ({
      ...p,
      updatedAt: new Date(p.updatedAt),
    })),
  );

  const chips = [
    { label: "Total", value: projects.length },
    { label: "Overdue", value: overdue.length },
    { label: "Today", value: dueToday.length },
  ];

  return (
    <div className="flex flex-col gap-8 px-8 py-10 md:py-12 lg:px-10 xl:max-w-6xl xl:mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Accounts"
          description="Monitor ICP fit, outreach, and follow-ups across your pipeline."
          mode="pipeline"
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/projects/board" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
                Board view
              </Link>
              <Link href="/projects/import" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
                Import
              </Link>
              <Link href="/templates" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
                Templates
              </Link>
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
        {chips.map((chip) => (
          <span key={chip.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {chip.label}: <span className="font-semibold text-white">{chip.value}</span>
          </span>
        ))}
      </div>

      <form className="grid gap-4 rounded-xl border border-white/10 bg-[#0F1012] px-6 py-6 text-sm text-slate-200 shadow-lg shadow-black/20 md:grid-cols-4">
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs text-slate-400" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search name, URL, tags"
            className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Status</label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_STATUSES.map((s) => {
              const checked = statusList.includes(s);
              return (
                <label key={s} className="flex items-center gap-1 rounded-md border border-white/5 bg-white/5 px-2 py-1 text-xs hover:border-emerald-500/50">
                  <input type="checkbox" name="status" value={s} defaultChecked={checked} className="accent-emerald-500" />
                  {s.replace(/_/g, " ")}
                </label>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Scores</label>
          <div className="flex gap-2">
            <input
              type="number"
              name="minICP"
              defaultValue={minICP ?? ""}
              placeholder="Min ICP"
              className="w-1/2 rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2 text-sm text-white"
            />
            <input
              type="number"
              name="minMQA"
              defaultValue={minMQA ?? ""}
              placeholder="Min MQA"
              className="w-1/2 rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
        <div className="flex items-end justify-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
          >
            Apply
          </button>
          <Link
            href="/projects"
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
          >
            Reset
          </Link>
          <a
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
            href={`/api/projects/export?q=${encodeURIComponent(q)}&status=${statusList.join(",")}&minICP=${minICP ?? ""}&minMQA=${minMQA ?? ""}`}
          >
            Export CSV
          </a>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <Table>
          <TableHeader>
            <tr>
              <th className="px-4 py-3">Overdue follow-ups</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next</th>
              <th className="px-4 py-3 text-right">Sequences</th>
            </tr>
          </TableHeader>
          <tbody>
            {overdue.map((p) => (
              <TableRow key={p.id}>
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}/workspace`} className="font-semibold text-emerald-300 hover:text-emerald-200">
                    {p.name || p.url}
                  </Link>
                  <p className="text-xs text-slate-400">{p.url}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-200">{p.status.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-sm text-slate-200">{formatDate(p.nextSequenceStepDueAt)}</td>
                <td className="px-4 py-3 text-right text-xs text-slate-300">{sequenceMap[p.id] ? `${sequenceMap[p.id]} active` : "-"}</td>
              </TableRow>
            ))}
            {overdue.length === 0 ? (
              <TableRow>
                <td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-500">
                  No overdue follow-ups 🎯
                </td>
              </TableRow>
            ) : null}
          </tbody>
        </Table>
        <Table>
          <TableHeader>
            <tr>
              <th className="px-4 py-3">Today</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next</th>
              <th className="px-4 py-3 text-right">Sequences</th>
            </tr>
          </TableHeader>
          <tbody>
            {dueToday.map((p) => (
              <TableRow key={p.id}>
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}/workspace`} className="font-semibold text-emerald-300 hover:text-emerald-200">
                    {p.name || p.url}
                  </Link>
                  <p className="text-xs text-slate-400">{p.url}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-200">{p.status.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-sm text-slate-200">{formatDate(p.nextSequenceStepDueAt)}</td>
                <td className="px-4 py-3 text-right text-xs text-slate-300">{sequenceMap[p.id] ? `${sequenceMap[p.id]} active` : "-"}</td>
              </TableRow>
            ))}
            {dueToday.length === 0 ? (
              <TableRow>
                <td colSpan={4} className="px-4 py-4 text-center text-xs text-slate-500">
                  Nothing due today 🎉
                </td>
              </TableRow>
            ) : null}
          </tbody>
        </Table>
      </div>

      <NewProjectForm />

      {sortedProjects.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Start by adding a protocol or converting an opportunity."
          icon="📁"
          primaryAction={{ label: "Create your first project", href: "/projects" }}
          secondaryAction={{ label: "Discover opportunities", href: "/discover" }}
        />
      ) : (
        <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <Table>
            <TableHeader>
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Scores</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next touch</th>
                <th className="px-4 py-3">Last updated</th>
              </tr>
            </TableHeader>
            <tbody>
              {sortedProjects.map((project) => (
                <TableRow key={project.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}/workspace`} className="font-semibold text-emerald-300 hover:text-emerald-200">
                      {project.name || project.url}
                    </Link>
                    <p className="text-xs text-slate-400">{project.url}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-300">
                      <Badge variant="neutral">ICP {project.icpScore ?? "-"}</Badge>
                      {sequenceMap[project.id] ? <Badge variant="info">{sequenceMap[project.id]} active seq</Badge> : null}
                      {project.hasOverdueSequenceStep ? (
                        <Badge variant="warning">Overdue</Badge>
                      ) : project.nextSequenceStepDueAt ? (
                        <Badge variant="neutral">Next {formatDate(project.nextSequenceStepDueAt)}</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-100">{project.icpScore ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-200">{project.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-slate-200">{formatDate(project.nextSequenceStepDueAt)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(project.updatedAt)}</td>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
