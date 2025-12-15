import SessionClient from "@/components/session/session-client";
import SequenceMode from "@/components/session/sequence-mode";
import { authOptions } from "@/lib/auth";
import { getNextContact } from "@/lib/session/getNextContact";
import { parseJsonString } from "@/lib/parsers";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NoteForm } from "@/components/projects/note-form";

export default async function SessionPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Fetch session stats for metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [pendingSteps, allContacts, activeSequences] = await Promise.all([
    prisma.sequenceStep.findMany({
      where: { status: "PENDING", sequence: { userId: session.user.id } },
      include: { sequence: true },
    }),
    prisma.contact.count({ where: { project: { userId: session.user.id } } }),
    prisma.sequence.count({ where: { userId: session.user.id, status: "ACTIVE" } }),
  ]);

  type PendingStepType = (typeof pendingSteps)[number];
  const overdueSteps = pendingSteps.filter((s: PendingStepType) => s.scheduledAt && s.scheduledAt < today);
  const dueTodaySteps = pendingSteps.filter(
    (s: PendingStepType) => s.scheduledAt && s.scheduledAt >= today && s.scheduledAt < new Date(today.getTime() + 24 * 60 * 60 * 1000)
  );

  const candidate = await getNextContact(session.user.id);

  if (!candidate) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Session Mode"
          description="No contacts need action right now."
          mode="execute"
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/radar"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
              >
                Open Radar
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                View Projects
              </Link>
            </div>
          }
        />

        {/* Metrics row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums text-white">{allContacts}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total contacts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/[0.08] px-4 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums text-white">{activeSequences}</p>
              <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Active sequences</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums text-white">{pendingSteps.length}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Pending steps</p>
            </div>
          </div>
        </div>

        <EmptyState
          title="No pending steps"
          description="You're caught up. Review leads or add sequences to accounts you care about."
          icon="🎉"
          primaryAction={{ label: "Open Lead Radar", href: "/radar" }}
          secondaryAction={{ label: "Go to Projects", href: "/projects" }}
        />
        <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <SectionHeader title="Sequences" />
          <SequenceMode />
        </Card>
      </div>
    );
  }

  const { project, contact } = candidate;
  const tags = parseJsonString<string[]>(project.categoryTags, []);
  const bdAngles = parseJsonString<string[]>(project.bdAngles, []);
  const playbookAngles = parseJsonString<string[]>(project.playbookAngles, []);
  const persona =
    contact.persona ||
    (contact.role &&
      (/founder|ceo|cto|co[- ]founder/i.test(contact.role)
        ? "Technical founder"
        : /engineer|developer|dev|protocol/i.test(contact.role)
          ? "Protocol engineer"
            : /bd|business|growth|ecosystem/i.test(contact.role)
            ? "BD / ecosystem lead"
            : undefined));
  const angle = playbookAngles[0] || bdAngles[0];

  const [sequence, interactions, notes] = await Promise.all([
    prisma.sequence.findFirst({
      where: { contactId: contact.id, userId: session.user.id },
      include: { steps: { orderBy: [{ scheduledAt: "asc" }, { stepNumber: "asc" }] } },
    }),
    prisma.interaction.findMany({
      where: { projectId: project.id, contactId: contact.id, userId: session.user.id },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
    prisma.note.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  type SequenceStepType = NonNullable<typeof sequence>["steps"][number];
  type InteractionType = (typeof interactions)[number];
  type NoteType = (typeof notes)[number];
  const upcomingSteps = (sequence?.steps || [])
    .filter((s: SequenceStepType) => s.status !== "SENT")
    .sort((a: SequenceStepType, b: SequenceStepType) => {
      if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return a.stepNumber - b.stepNumber;
    })
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Mode"
        description="Work through the next best contact with focused outreach."
        mode="execute"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Press Cmd+K for shortcuts</span>
            <Link
              href="/radar"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Radar
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Projects
            </Link>
          </div>
        }
      />

      {/* Metrics row */}
      <div className="flex flex-wrap gap-3">
        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${overdueSteps.length > 0 ? "bg-rose-500/[0.08] hover:bg-rose-500/[0.12] cursor-pointer" : "bg-white/[0.02]"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-500/15 relative">
            {overdueSteps.length > 0 && <span className="absolute h-2 w-2 rounded-full bg-rose-400 animate-ping opacity-75" />}
            <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{overdueSteps.length}</p>
            <p className="text-[10px] text-rose-400/70 uppercase tracking-wide">Overdue</p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${dueTodaySteps.length > 0 ? "bg-amber-500/[0.08] hover:bg-amber-500/[0.12] cursor-pointer" : "bg-white/[0.02]"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/15">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{dueTodaySteps.length}</p>
            <p className="text-[10px] text-amber-400/70 uppercase tracking-wide">Due today</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-emerald-500/[0.08] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{activeSequences}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Active sequences</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{allContacts}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total contacts</p>
          </div>
        </div>
      </div>

      {/* Focus card for current contact */}
      <Card className="flex flex-col gap-4 overflow-hidden border-purple-400/20 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Current focus</p>
            <span className="rounded-full bg-purple-500/15 px-3 py-1 text-[11px] font-semibold text-purple-100">Next contact</span>
          </div>
          <p className="text-lg font-semibold text-white">{contact.name} at {project.name || project.url}</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{contact.role || "No role"}</span>
            {contact.channelPreference && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">Prefers {contact.channelPreference}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <Link
            href={`/projects/${project.id}/workspace?contactId=${contact.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-purple-400/60 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:border-purple-300 hover:bg-purple-500/20"
          >
            Open workspace
          </Link>
        </div>
      </Card>

      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <SectionHeader title="Sequences" />
        <SequenceMode />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4 rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <SectionHeader title="Account" />
          <div className="space-y-2">
            <p className="text-xs uppercase text-slate-400">Project</p>
            <h2 className="text-xl font-semibold text-white">{project.name || project.url}</h2>
            <p className="text-sm text-slate-400">{project.url}</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
              {project.icpScore ? <Badge variant="neutral">ICP {project.icpScore}</Badge> : null}
              {project.mqaScore ? <Badge variant="neutral">MQA {project.mqaScore}</Badge> : null}
              {project.nextFollowUpAt ? <Badge variant="info">Next {formatDate(project.nextFollowUpAt)}</Badge> : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              {tags.map((tag: string) => (
                <span key={tag} className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">
                  {tag}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-200">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">ICP</p>
                <p className="text-lg font-bold">{project.icpScore ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">MQA</p>
                <p className="text-lg font-bold">{project.mqaScore ?? "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">BD Angles</p>
              <ul className="mt-1 space-y-1 text-sm text-slate-200">
                {bdAngles.length > 0 ? bdAngles.map((a: string, idx: number) => <li key={idx}>• {a}</li>) : <li>-</li>}
              </ul>
            </div>
            <div className="text-xs text-emerald-300 space-y-1">
              {project.twitter ? <a href={project.twitter} target="_blank" rel="noreferrer">Twitter</a> : null}
              {project.telegram ? <a href={project.telegram} target="_blank" rel="noreferrer" className="block">Telegram</a> : null}
              {project.discord ? <a href={project.discord} target="_blank" rel="noreferrer" className="block">Discord</a> : null}
              {project.github ? <a href={project.github} target="_blank" rel="noreferrer" className="block">GitHub</a> : null}
              {project.medium ? <a href={project.medium} target="_blank" rel="noreferrer" className="block">Medium</a> : null}
            </div>
          </div>
        </Card>

        <Card className="space-y-3 rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <SectionHeader title="Contact" />
          <div className="space-y-1">
            <p className="text-xs uppercase text-slate-400">Contact</p>
            <h3 className="text-lg font-semibold text-white">{contact.name}</h3>
            <p className="text-sm text-slate-400">{contact.role}</p>
            {contact.channelPreference ? (
              <p className="text-[11px] text-emerald-300 mt-1">Prefers {contact.channelPreference}</p>
            ) : null}
            {(persona || angle) ? (
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-emerald-200">
                {persona ? <span className="rounded-full bg-emerald-500/10 px-2 py-1">Persona: {persona}</span> : null}
                {angle ? <span className="rounded-full border border-emerald-500/40 px-2 py-1 text-emerald-200">Angle: {angle}</span> : null}
              </div>
            ) : null}
            <div className="text-xs text-slate-300 space-y-1 mt-2">
              {contact.email ? <p>Email: {contact.email}</p> : null}
              {contact.linkedinUrl ? <p>LinkedIn: {contact.linkedinUrl}</p> : null}
              {contact.twitterHandle ? <p>Twitter: {contact.twitterHandle}</p> : null}
              {contact.telegram ? <p>Telegram: {contact.telegram}</p> : null}
            </div>
          </div>
          <Link
            href={`/projects/${project.id}/workspace?contactId=${contact.id}`}
            className="mt-2 inline-flex rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
          >
            Open workspace
          </Link>
          <SessionClient project={project} contact={contact} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <SectionHeader title="Upcoming steps" />
          {upcomingSteps.length === 0 ? (
            <p className="text-sm text-slate-400">No scheduled steps remain for this contact.</p>
          ) : (
            <div className="divide-y divide-white/5">{
              upcomingSteps.map((step: SequenceStepType) => (
                <div key={step.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase text-slate-500">Step {step.stepNumber}</p>
                    <p className="text-sm text-white">{step.channel}</p>
                    <p className="text-xs text-slate-400">{step.content}</p>
                  </div>
                  <div className="text-right text-xs text-slate-300 space-y-1">
                    <Badge variant="neutral">{step.status}</Badge>
                    <p className="text-[11px] text-slate-400">
                      {step.scheduledAt ? `Scheduled ${formatDate(step.scheduledAt)}` : "Not scheduled"}
                    </p>
                  </div>
                </div>
              ))
            }</div>
          )}
        </Card>
        <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <SectionHeader title="Quick notes" />
          <div className="space-y-4">
            <NoteForm projectId={project.id} />
            <div className="space-y-2">
              <p className="text-xs uppercase text-slate-500">Recent touches</p>
              {interactions.length === 0 ? (
                <p className="text-sm text-slate-400">No touchpoints logged yet.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-200">
                  {interactions.map((i: InteractionType) => (
                    <li key={i.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="uppercase">{i.channel}</span>
                        <span>{formatDate(i.occurredAt)}</span>
                      </div>
                      <p className="text-sm text-white">{i.title || i.type}</p>
                      {i.body ? <p className="text-xs text-slate-300">{i.body}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase text-slate-500">Recent notes</p>
              {notes.length === 0 ? (
                <p className="text-sm text-slate-400">No notes yet.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-200">
                  {notes.map((note: NoteType) => (
                    <li key={note.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Note</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-sm text-white whitespace-pre-wrap">{note.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
