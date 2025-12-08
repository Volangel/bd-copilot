import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pickNextSequenceStep } from "@/lib/sequences/nextStep";
import { sortProjectsByPriority } from "@/lib/pipeline/priority";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/header";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { MetricsCard } from "./components/MetricsCard";
import { SectionCard } from "./components/SectionCard";
import { OnboardingChecklist } from "./components/OnboardingChecklist";
import { TopPipelineList } from "./components/TopPipelineList";

export default async function TodayPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const nowDate = new Date();
  const reviewableOppWhere = {
    userId,
    OR: [{ status: "NEW" }, { status: "SNOOZED", nextReviewAt: { lte: nowDate } }],
  } as const;

  const [steps, opportunities, newOppCount, projects, playbooks, watchlist, contacts, sequences, icp, firstProject] = await Promise.all([
    prisma.sequenceStep.findMany({
      where: { status: "PENDING", sequence: { userId } },
      include: { sequence: { include: { project: true, contact: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.opportunity.findMany({ where: reviewableOppWhere, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.opportunity.count({ where: reviewableOppWhere }),
    prisma.project.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { contacts: true } }),
    prisma.playbook.findMany({ where: { userId } }),
    prisma.watchlistUrl.findMany({ where: { userId } }),
    prisma.contact.findMany({ where: { project: { userId } } }),
    prisma.sequence.findMany({ where: { userId } }),
    prisma.iCPProfile.findUnique({ where: { userId } }),
    prisma.project.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  const stepMeta = new Map<string, { next: Date | null; overdue: boolean }>();
  projects.forEach((p) => stepMeta.set(p.id, { next: null, overdue: false }));
  steps.forEach((s) => {
    const pid = s.sequence.projectId;
    const entry = stepMeta.get(pid);
    if (!entry) return;
    const due = s.scheduledAt || null;
    if (due && (!entry.next || due < entry.next)) entry.next = due;
    if (due && due < nowDate) entry.overdue = true;
  });

  const overdueSteps = steps.filter((s) => s.scheduledAt && s.scheduledAt < nowDate);
  const uniqueOverdueProjects = new Set(overdueSteps.map((s) => s.sequence.projectId));
  const topOverdue = overdueSteps.slice(0, 5);

  const upcoming = steps
    .filter((s) => s.scheduledAt && s.scheduledAt >= nowDate && s.scheduledAt.getTime() - nowDate.getTime() <= 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0))
    .slice(0, 5);

  const sortedProjects = sortProjectsByPriority(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      url: p.url,
      updatedAt: new Date(p.updatedAt),
      hasOverdueSequenceStep: stepMeta.get(p.id)?.overdue ?? false,
      nextSequenceStepDueAt: stepMeta.get(p.id)?.next ?? null,
    })),
  );

  const onboardingSteps = [
    {
      label: "Create your ICP profile",
      done: !!icp,
      href: "/settings",
    },
    {
      label: "Create your first playbook",
      done: playbooks.length > 0,
      href: "/settings/playbooks",
    },
    {
      label: "Add a watchlist URL or scan for leads",
      done: watchlist.length > 0 || opportunities.length > 0,
      href: "/discover/scan",
    },
    {
      label: "Create your first project",
      done: projects.length > 0,
      href: "/projects",
    },
    {
      label: "Create your first contact & sequence",
      done: contacts.length > 0 && sequences.length > 0,
      href: firstProject ? `/projects/${firstProject.id}/contact-workbench` : "/projects",
    },
  ];
  const allOnboardingDone = onboardingSteps.every((s) => s.done);

  const nextStep = pickNextSequenceStep(
    steps.map((s) => ({ id: s.id, stepNumber: s.stepNumber, status: s.status, scheduledAt: s.scheduledAt })),
    nowDate,
  );

  const stats = [
    { label: "Overdue follow-ups", value: uniqueOverdueProjects.size },
    { label: "Due today", value: upcoming.length },
    { label: "New opps", value: newOppCount },
  ];

  const quickActions = [
    { label: "Add project", href: "/projects" },
    { label: "Scan leads", href: "/discover/scan" },
    { label: "Create playbook", href: "/settings/playbooks" },
    { label: "Add watchlist URL", href: "/settings/watchlist" },
    { label: "Session mode", href: "/session", tone: "primary" },
  ];

  const focusTarget = topOverdue[0] || nextStep || opportunities[0];
  const focusLabel = topOverdue[0]
    ? "Overdue follow-up"
    : nextStep
      ? "Scheduled touch"
      : opportunities[0]
        ? "New lead to review"
        : "Keep momentum";
  const focusCta = topOverdue[0] || nextStep ? { label: "Open Session", href: "/session" } : { label: "Open Radar", href: "/radar" };
  const focusSummary = topOverdue[0]
    ? `${topOverdue[0].sequence.project.name || topOverdue[0].sequence.project.url} · ${topOverdue[0].channel}`
    : nextStep
      ? `Step ${nextStep.stepNumber} ${nextStep.scheduledAt ? `scheduled ${formatDate(nextStep.scheduledAt)}` : "ready to schedule"}`
      : opportunities[0]
        ? opportunities[0].title || opportunities[0].url
        : "Nothing urgent in the queue. Use the quick actions to keep momentum.";

  return (
    <>
      <PageHeader
        title="Today"
        description="Top priorities for your BD workflow."
        mode="other"
        actions={
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  action.tone === "primary"
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300 hover:bg-emerald-500/20"
                    : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        }
      />

      <Card className="flex flex-col gap-4 border-white/10 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Focus for today</p>
            {focusTarget ? (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  topOverdue[0]
                    ? "bg-red-500/15 text-red-100"
                    : nextStep
                      ? "bg-amber-400/15 text-amber-100"
                      : opportunities[0]
                        ? "bg-blue-500/15 text-blue-100"
                        : "bg-white/10 text-white"
                }`}
              >
                {focusLabel}
              </span>
            ) : null}
          </div>
          <p className="text-lg font-semibold text-white">{focusTarget ? focusSummary : "You’re caught up"}</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-tertiary)]">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Overdue: {stats[0].value}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Due today: {stats[1].value}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">New opps: {stats[2].value}</span>
          </div>
          {nextStep ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Next step #{nextStep.stepNumber}</span>
              <span>{nextStep.scheduledAt ? `Scheduled ${formatDate(nextStep.scheduledAt)}` : "Ready to schedule"}</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-3 text-sm md:items-end">
          <Link
            href={focusCta.href}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
          >
            {focusCta.label}
          </Link>
          <Link
            href="/session"
            className="text-xs text-emerald-300 underline-offset-2 hover:text-emerald-200 hover:underline"
          >
            Start with AI draft
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SectionCard title="Discover" description="Review new leads and scan for opportunities">
          <Link
            href="/radar"
            className="inline-flex rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
          >
            Go to Discover
          </Link>
        </SectionCard>
        <SectionCard title="Pipeline" description="Organize and prioritize your accounts">
          <Link
            href="/projects"
            className="inline-flex rounded-lg border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20"
          >
            Open Pipeline
          </Link>
        </SectionCard>
        <SectionCard title="Execute" description="Work today’s follow-ups and sequences">
          <Link
            href="/session"
            className="inline-flex rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-200 transition hover:border-purple-400 hover:bg-purple-500/20"
          >
            Start Session
          </Link>
        </SectionCard>
      </div>

      {!allOnboardingDone ? (
        <OnboardingChecklist steps={onboardingSteps} />
      ) : (
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-emerald-200 shadow-lg shadow-black/20">
          You’re set up 🎉
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricsCard title="Overdue follow-ups" value={stats[0].value} helper="Across all projects" accent="danger" cta={{ label: "Open Session", href: "/session" }} />
        <MetricsCard title="Due today" value={stats[1].value} helper="Touches scheduled for today" accent="warning" cta={{ label: "Plan day", href: "/session" }} />
        <MetricsCard title="New leads to review" value={stats[2].value} helper="Lead review queue" accent="neutral" cta={{ label: "Open Radar", href: "/radar" }} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SectionCard title="Overdue & Today’s Follow-ups" description="Steps that need attention now">
          {topOverdue.length === 0 && !nextStep ? (
            <div className="flex flex-col items-center justify-center text-center py-10 opacity-80">
              <div className="text-3xl">🎉</div>
              <p className="mt-2 text-lg font-semibold text-white">Nothing overdue</p>
              <p className="text-sm text-slate-400">You’re caught up!</p>
              <Link href="/session" className="mt-3 text-sm text-emerald-300 hover:underline">
                Go to Session
              </Link>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {topOverdue.map((s) => (
                <Link
                  key={s.id}
                  href="/session"
                  className="block rounded-lg border border-white/5 bg-white/5 px-3 py-3 transition hover:border-white/15 hover:bg-white/10"
                >
                  <p className="font-semibold text-white">{s.sequence.project.name || s.sequence.project.url}</p>
                  <p className="text-xs text-slate-400">
                    {s.sequence.contact?.name || "Contact"} · {s.channel}
                  </p>
                  <p className="text-[11px] text-amber-300">Due {formatDate(s.scheduledAt)}</p>
                </Link>
              ))}
              {topOverdue.length === 0 && nextStep ? (
                <p className="text-xs text-slate-400">
                  Next step: {nextStep.scheduledAt ? formatDate(nextStep.scheduledAt) : "unscheduled"} — jump into{" "}
                  <Link href="/session" className="text-emerald-300 hover:underline">
                    Session Mode
                  </Link>
                  .
                </p>
              ) : null}
              <p className="text-xs text-slate-500">Projects with overdue steps: {uniqueOverdueProjects.size}</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Upcoming touches (next 7 days)" description="Stay ahead of scheduled follow-ups">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 opacity-80">
              <div className="text-3xl">⏳</div>
              <p className="mt-2 text-lg font-semibold text-white">No scheduled touches</p>
              <p className="text-sm text-slate-400">Schedule follow-ups to keep momentum.</p>
              <Link href="/session" className="mt-3 text-sm text-emerald-300 hover:underline">
                Open Session
              </Link>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {upcoming.map((s) => (
                <div key={s.id} className="rounded-lg border border-white/5 bg-white/5 px-3 py-3 transition hover:border-white/15 hover:bg-white/10">
                  <p className="font-semibold text-white">{s.sequence.project.name || s.sequence.project.url}</p>
                  <p className="text-xs text-slate-400">
                    {s.sequence.contact?.name || "Contact"} · {s.channel}
                  </p>
                  <p className="text-[11px] text-slate-400">Due {formatDate(s.scheduledAt)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="New opportunities" description="Latest leads detected from scans">
          {opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 opacity-80">
              <div className="text-3xl">🔍</div>
              <p className="mt-2 text-lg font-semibold text-white">No opportunities yet</p>
              <p className="text-sm text-slate-400">Scan text or watchlist to fill the queue.</p>
              <div className="mt-3 flex gap-2 text-sm">
                <Link href="/discover/scan" className="text-emerald-300 hover:underline">
                  Scan text
                </Link>
                <span className="text-slate-600">·</span>
                <Link href="/settings/watchlist" className="text-emerald-300 hover:underline">
                  Scan watchlist
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {opportunities.map((o) => (
                <div key={o.id} className="rounded-lg border border-white/5 bg-white/5 px-3 py-3 transition hover:border-white/15 hover:bg-white/10">
                  <p className="font-semibold text-white">{o.title || o.url}</p>
                  <p className="text-xs text-slate-400">Lead score: {o.leadScore ?? "-"}</p>
                  <p className="text-[11px] text-slate-500">{o.url}</p>
                  <div className="mt-2 flex gap-2 text-[11px] text-emerald-300">
                    <Link href="/radar" className="hover:underline">
                      Open in Radar
                    </Link>
                    <span className="text-slate-600">·</span>
                    <Link href={`/leads/review?id=${o.id}`} className="hover:underline">
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <TopPipelineList
        items={sortedProjects.map((p) => ({
          id: p.id,
          name: p.name,
          url: p.url,
          hasOverdueSequenceStep: p.hasOverdueSequenceStep,
          nextSequenceStepDueAt: p.nextSequenceStepDueAt,
        }))}
      />
    </>
  );
}
