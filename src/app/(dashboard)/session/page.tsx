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

  const candidate = await getNextContact(session.user.id);

  if (!candidate) {
    return (
      <div className="flex flex-col gap-6 px-8 py-10 md:py-12 lg:px-10 xl:max-w-6xl xl:mx-auto">
        <PageHeader title="Session Mode" description="No contacts need action right now." mode="execute" />
        <EmptyState
          title="No pending steps"
          description="You’re caught up. Review leads or add sequences to accounts you care about."
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

  const upcomingSteps = (sequence?.steps || [])
    .filter((s) => s.status !== "SENT")
    .sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return a.stepNumber - b.stepNumber;
    })
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-8 px-8 py-10 md:py-12 lg:px-10 xl:max-w-6xl xl:mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Session Mode" description="Work through the next best contact with focused outreach." mode="execute" />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Press Cmd+K for shortcuts.</span>
          <Link href="/radar" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 transition hover:bg-white/10 hover:text-emerald-300">
            Radar
          </Link>
          <Link href="/projects" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 transition hover:bg-white/10 hover:text-emerald-300">
            Projects
          </Link>
        </div>
      </div>

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
              {tags.map((tag) => (
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
              upcomingSteps.map((step) => (
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
                  {interactions.map((i) => (
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
                  {notes.map((note) => (
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
