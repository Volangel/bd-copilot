import { NoteForm } from "@/components/projects/note-form";
import { InteractionForm } from "@/components/projects/interaction-form";
import { authOptions } from "@/lib/auth";
import { parseJsonString } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/header";
import { Badge } from "@/components/ui/badge";
import { AIContactFinder } from "@/app/(dashboard)/projects/[id]/contact-workbench/ai-contact-finder";
import { ContactCaptureForm } from "@/components/contacts/contact-capture-form";
import SequenceBuilder from "@/app/(dashboard)/projects/[id]/contact-workbench/sequence-builder";
import { OutreachForm } from "@/components/projects/outreach-form";
import { StepListClient } from "./step-list-client";
import { PlaybookCardClient } from "./playbook-card-client";
import { buildStepMeta } from "@/lib/pipeline/stepMeta";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { WorkspaceClient } from "@/components/workspace";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspace({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      contacts: {
        include: {
          outreach: { orderBy: { createdAt: "desc" }, take: 10 },
          interactions: { orderBy: { occurredAt: "desc" }, take: 10 },
          sequence: { include: { steps: true } },
        },
      },
      outreach: { orderBy: { createdAt: "desc" }, take: 20 },
      notes: { orderBy: { createdAt: "desc" }, take: 20 },
      interactions: { orderBy: { occurredAt: "desc" }, take: 20 },
      sequences: {
        include: { steps: true, contact: true },
      },
    },
  });
  if (!project) notFound();

  const tags = parseJsonString<string[]>(project.categoryTags, []);
  const bdAngles = parseJsonString<string[]>(project.bdAngles, []);
  const playbookPersonas = parseJsonString<string[]>(project.playbookPersonas, []);
  const playbookAngles = parseJsonString<string[]>(project.playbookAngles, []);
  const playbookSummary = project.playbookSummary || "";
  const templates = await prisma.template.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const pendingSteps = project.sequences.flatMap((s) =>
    s.steps.filter((st) => st.status === "PENDING").map((st) => ({ ...st, contact: s.contact, sequence: { projectId: project.id } })),
  );
  const stepMeta = buildStepMeta(
    pendingSteps.map((st) => ({ scheduledAt: st.scheduledAt, sequence: { projectId: project.id } })),
    [project.id],
  );
  const nextSequenceStepDueAt = stepMeta.get(project.id)?.nextSequenceStepDueAt || null;
  const hasOverdueSequenceStep = stepMeta.get(project.id)?.hasOverdueSequenceStep || false;
  const nextStep = pendingSteps
    .filter((st) => st.scheduledAt)
    .sort((a, b) => (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0))[0];

  const resolvedSearch = (await searchParams) || {};
  const highlightedStepId =
    typeof resolvedSearch.stepId === "string" ? resolvedSearch.stepId : Array.isArray(resolvedSearch.stepId) ? resolvedSearch.stepId[0] : null;
  let selectedContactId =
    typeof resolvedSearch.contactId === "string"
      ? resolvedSearch.contactId
      : Array.isArray(resolvedSearch.contactId)
        ? resolvedSearch.contactId[0]
        : null;
  if (!selectedContactId && highlightedStepId) {
    const seqWithStep = project.sequences.find((s) => s.steps.some((st) => st.id === highlightedStepId));
    if (seqWithStep?.contactId) {
      selectedContactId = seqWithStep.contactId;
    }
  }
  if (!selectedContactId) {
    selectedContactId = project.contacts[0]?.id || null;
  }
  const selectedContact = project.contacts.find((c) => c.id === selectedContactId) || project.contacts[0] || null;

  // Transform contacts for client component
  const contactsForClient = project.contacts.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    persona: c.persona,
    email: c.email,
    linkedinUrl: c.linkedinUrl,
    twitterHandle: c.twitterHandle,
    telegram: c.telegram,
    channelPreference: c.channelPreference,
    sequence: c.sequence
      ? {
          steps: c.sequence.steps.map((s) => ({
            id: s.id,
            status: s.status,
            stepNumber: s.stepNumber,
            channel: s.channel,
            content: s.content,
            scheduledAt: s.scheduledAt?.toISOString() || null,
          })),
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Workspace"
        description="Work this account end-to-end: context, contacts, sequences, interactions."
        mode="pipeline"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/session"
              className="inline-flex items-center gap-2 rounded-full border border-purple-400/60 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:border-purple-300 hover:bg-purple-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Session
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Accounts
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
            <p className="text-xl font-semibold tabular-nums text-white">{project.contacts.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Contacts</p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${pendingSteps.length > 0 ? "bg-amber-500/[0.08]" : "bg-white/[0.02]"}`}>
          <div className={`relative flex h-8 w-8 items-center justify-center rounded-md ${pendingSteps.length > 0 ? "bg-amber-500/15" : "bg-slate-500/10"}`}>
            {hasOverdueSequenceStep && <span className="absolute h-2 w-2 rounded-full bg-rose-400 animate-ping opacity-75" />}
            <svg className={`h-4 w-4 ${pendingSteps.length > 0 ? "text-amber-400" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{pendingSteps.length}</p>
            <p className={`text-[10px] uppercase tracking-wide ${pendingSteps.length > 0 ? "text-amber-400/70" : "text-slate-500"}`}>Pending</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-blue-500/[0.08] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/15">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{project.interactions.length}</p>
            <p className="text-[10px] text-blue-400/70 uppercase tracking-wide">Interactions</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{project.notes.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Notes</p>
          </div>
        </div>
      </div>

      <WorkspaceClient
        projectId={project.id}
        projectName={project.name || project.url}
        projectUrl={project.url}
        hasSummary={Boolean(project.summary)}
        hasPlaybook={Boolean(playbookSummary || playbookPersonas.length || playbookAngles.length)}
        contacts={contactsForClient}
        pendingStepsCount={pendingSteps.length}
        interactionsCount={project.interactions.length}
        notesCount={project.notes.length}
      >
        {{
          accountInfo: (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                <Badge variant="neutral">Status {project.status.replace(/_/g, " ")}</Badge>
                {project.icpScore ? <Badge variant="neutral">ICP {project.icpScore}</Badge> : null}
                {project.mqaScore ? <Badge variant="neutral">MQA {project.mqaScore}</Badge> : null}
                {project.lastContactAt ? <Badge variant="outline">Last contact {formatDate(project.lastContactAt)}</Badge> : null}
                {nextSequenceStepDueAt ? <Badge variant="info">Next touch {formatDate(nextSequenceStepDueAt)}</Badge> : null}
                {hasOverdueSequenceStep ? <Badge variant="warning">Overdue</Badge> : null}
                <Badge variant="outline">Updated {formatDate(project.updatedAt)}</Badge>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="bg-[#1E2022]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-emerald-300">
                {project.twitter ? <a href={project.twitter} target="_blank" rel="noreferrer" className="hover:underline">Twitter</a> : null}
                {project.telegram ? <a href={project.telegram} target="_blank" rel="noreferrer" className="hover:underline">Telegram</a> : null}
                {project.discord ? <a href={project.discord} target="_blank" rel="noreferrer" className="hover:underline">Discord</a> : null}
                {project.github ? <a href={project.github} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a> : null}
                {project.medium ? <a href={project.medium} target="_blank" rel="noreferrer" className="hover:underline">Medium</a> : null}
              </div>
            </div>
          ),
          summary: (
            <div className="space-y-4">
              <p className="text-sm text-slate-200">{project.summary || "No summary yet."}</p>
              <div className="grid gap-3 text-sm text-slate-200">
                <div>
                  <p className="text-xs uppercase text-slate-500">Target users</p>
                  <p>{project.targetUsers || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Pain points</p>
                  <p>{project.painPoints || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">BD angles</p>
                  <div className="mt-1 space-y-1">
                    {bdAngles.length > 0 ? bdAngles.map((angle, idx) => <p key={idx}>• {angle}</p>) : <p>—</p>}
                  </div>
                </div>
              </div>
            </div>
          ),
          playbook: (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <PlaybookCardClient
                  projectId={project.id}
                  hasPlaybook={Boolean(playbookSummary || playbookPersonas.length || playbookAngles.length)}
                  hasAnalysis={Boolean(project.summary)}
                />
              </div>
              {playbookSummary ? <p className="text-sm text-slate-200">{playbookSummary}</p> : null}
              {playbookPersonas.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                  {playbookPersonas.map((p) => (
                    <Badge key={p} variant="neutral">{p}</Badge>
                  ))}
                </div>
              )}
              {playbookAngles.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                  {playbookAngles.map((a) => (
                    <Badge key={a} variant="outline" className="bg-[#1E2022]">{a}</Badge>
                  ))}
                </div>
              )}
            </div>
          ),
          nextAction: nextStep ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase text-amber-300 mb-1">Pending step</p>
                  <p className="font-semibold text-white text-lg">{nextStep.contact?.name || "Contact"}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5">{nextStep.channel}</span>
                      <span className="truncate max-w-[300px]">{nextStep.content.slice(0, 100)}...</span>
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">Due {nextStep.scheduledAt ? formatDate(nextStep.scheduledAt) : "soon"}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/projects/${project.id}/workspace?tab=contacts&contactId=${nextStep.contact?.id ?? ""}&stepId=${nextStep.id}`}
                    className="rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors text-center"
                  >
                    View in Contacts
                  </Link>
                  <Link
                    href={`/session?projectId=${project.id}`}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors text-center"
                  >
                    Open Session
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300 text-center">
              <p>No pending steps.</p>
              <p className="text-xs text-slate-500 mt-1">Create a sequence or add a contact to start outreach.</p>
            </div>
          ),
          contactForm: (
            <ContactCaptureForm
              defaultProjectId={project.id}
              compact
              refreshOnSuccess
            />
          ),
          aiContactFinder: <AIContactFinder projectId={project.id} />,
          sequenceBuilder: (
            <SequenceBuilder
              projectId={project.id}
              contacts={project.contacts.map((c) => ({ id: c.id, name: c.name, role: c.role }))}
              playbooks={[]}
            />
          ),
          selectedContactSteps: selectedContact?.sequence?.steps.length ? (
            <StepListClient
              steps={selectedContact.sequence.steps.map((st) => ({
                id: st.id,
                stepNumber: st.stepNumber,
                channel: st.channel,
                content: st.content,
                status: st.status,
                scheduledAt: st.scheduledAt ? st.scheduledAt.toISOString() : null,
                sentAt: st.sentAt ? st.sentAt.toISOString() : null,
              }))}
              highlightId={highlightedStepId}
            />
          ) : null,
          outreachForm: selectedContact ? (
            <OutreachForm
              projectId={project.id}
              contactId={selectedContact.id}
              contactName={selectedContact.name}
              projectName={project.name || project.url || "Project"}
              templates={templates.map((t) => ({ id: t.id, title: t.title, content: t.content }))}
              personaLabel={
                selectedContact.persona ||
                (selectedContact.role &&
                (/founder|ceo|cto|co[- ]founder/i.test(selectedContact.role)
                  ? "Technical founder"
                  : /engineer|developer|dev|protocol/i.test(selectedContact.role)
                    ? "Protocol engineer"
                    : /bd|business|growth|ecosystem/i.test(selectedContact.role)
                      ? "BD / ecosystem lead"
                      : undefined))
              }
              angleLabel={playbookAngles[0] || bdAngles[0]}
            />
          ) : null,
          interactionForm: <InteractionForm projectId={project.id} contacts={project.contacts} />,
          noteForm: <NoteForm projectId={project.id} />,
          interactions: (
            <div className="space-y-2 text-sm text-slate-200 max-h-[400px] overflow-y-auto">
              {project.interactions.map((interaction) => (
                <div key={interaction.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase text-slate-400">
                      {interaction.channel} · {interaction.type}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDate(interaction.occurredAt)}</p>
                  </div>
                  <p className="text-slate-200 font-semibold">{interaction.title || "Interaction"}</p>
                  {interaction.body ? <p className="text-slate-200 text-sm mt-1">{interaction.body}</p> : null}
                </div>
              ))}
            </div>
          ),
          notes: (
            <div className="space-y-2 text-sm text-slate-200 max-h-[400px] overflow-y-auto">
              {project.notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 hover:border-slate-700 transition-colors">
                  <p>{note.content}</p>
                  <p className="text-[11px] text-slate-500 mt-2">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
          ),
        }}
      </WorkspaceClient>
    </div>
  );
}
