import { NoteForm } from "@/components/projects/note-form";
import { InteractionForm } from "@/components/projects/interaction-form";
import { authOptions } from "@/lib/auth";
import { parseJsonString } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIContactFinder } from "@/app/(dashboard)/projects/[id]/contact-workbench/ai-contact-finder";
import { ContactCaptureForm } from "@/components/contacts/contact-capture-form";
import SequenceBuilder from "@/app/(dashboard)/projects/[id]/contact-workbench/sequence-builder";
import { OutreachForm } from "@/components/projects/outreach-form";
import { StepListClient } from "./step-list-client";
import { PlaybookCardClient } from "./playbook-card-client";
import { ContactPersonaSelect } from "./contact-persona-select";
import { buildStepMeta } from "@/lib/pipeline/stepMeta";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

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
  const lastOutreach = project.outreach[0];

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
  return (
    <>
      <PageHeader
        title="Account Workspace"
        description="Work this account end-to-end: context, contacts, sequences, interactions."
        mode="pipeline"
        actions={
          <div className="flex gap-2">
            <Link href="/projects" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
              Back to Accounts
            </Link>
            <Link href={`/projects/${project.id}`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10">
              Legacy view
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-4 lg:col-span-5">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-white">{project.name || project.url}</p>
                <p className="text-xs text-slate-500">{project.url}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                  <Badge variant="neutral">Status {project.status.replace(/_/g, " ")}</Badge>
                  {project.icpScore ? <Badge variant="neutral">ICP {project.icpScore}</Badge> : null}
                  {project.mqaScore ? <Badge variant="neutral">MQA {project.mqaScore}</Badge> : null}
                  {project.lastContactAt ? <Badge variant="outline">Last contact {formatDate(project.lastContactAt)}</Badge> : null}
                  {nextSequenceStepDueAt ? <Badge variant="info">Next touch {formatDate(nextSequenceStepDueAt)}</Badge> : null}
                  {hasOverdueSequenceStep ? <Badge variant="warning">Overdue</Badge> : null}
                  <Badge variant="outline">Updated {formatDate(project.updatedAt)}</Badge>
                  {lastOutreach ? <Badge variant="neutral">Last outreach {formatDate(lastOutreach.createdAt)}</Badge> : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="bg-[#1E2022]">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-emerald-300 space-y-1">
              {project.twitter ? <a href={project.twitter} target="_blank" rel="noreferrer">Twitter</a> : null}
              {project.telegram ? <a href={project.telegram} target="_blank" rel="noreferrer" className="block">Telegram</a> : null}
              {project.discord ? <a href={project.discord} target="_blank" rel="noreferrer" className="block">Discord</a> : null}
              {project.github ? <a href={project.github} target="_blank" rel="noreferrer" className="block">GitHub</a> : null}
              {project.medium ? <a href={project.medium} target="_blank" rel="noreferrer" className="block">Medium</a> : null}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Summary & Insights</p>
              <Badge variant="outline">Analysis</Badge>
            </div>
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
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Account Playbook</p>
                <p className="text-xs text-slate-500">Personas and angles to target for this account.</p>
              </div>
              <PlaybookCardClient
                projectId={project.id}
                hasPlaybook={Boolean(playbookSummary || playbookPersonas.length || playbookAngles.length)}
                hasAnalysis={Boolean(project.summary)}
              />
            </div>
            {playbookSummary ? <p className="text-sm text-slate-200">{playbookSummary}</p> : <p className="text-sm text-slate-500">No playbook yet. Generate to get tailored personas and angles.</p>}
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              {playbookPersonas.map((p) => (
                <Badge key={p} variant="neutral">
                  {p}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              {playbookAngles.map((a) => (
                <Badge key={a} variant="outline" className="bg-[#1E2022]">
                  {a}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Activity</p>
              <p className="text-xs text-slate-500">{project.interactions.length} entries</p>
            </div>
            <div className="space-y-2 text-sm text-slate-200">
              {project.interactions.map((interaction) => (
                <div key={interaction.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase text-slate-400">
                      {interaction.channel} · {interaction.type}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDate(interaction.occurredAt)}</p>
                  </div>
                  <p className="text-slate-200 font-semibold">{interaction.title || "Interaction"}</p>
                  {interaction.body ? <p className="text-slate-200">{interaction.body}</p> : null}
                </div>
              ))}
              {project.interactions.length === 0 ? <p className="text-slate-500">No interactions yet.</p> : null}
            </div>
            <InteractionForm projectId={project.id} contacts={project.contacts} />
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Notes</p>
              <p className="text-xs text-slate-500">{project.notes.length} entries</p>
            </div>
            <div className="space-y-2 text-sm text-slate-200">
              {project.notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p>{note.content}</p>
                  <p className="text-[11px] text-slate-500">{formatDate(note.createdAt)}</p>
                </div>
              ))}
              {project.notes.length === 0 ? <p className="text-slate-500">No notes yet.</p> : null}
            </div>
            <NoteForm projectId={project.id} />
          </Card>
        </div>

        <div className="col-span-12 space-y-4 lg:col-span-7">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Next action</p>
                <p className="text-xs text-slate-500">Project-scoped pending step</p>
              </div>
              <Link href="/session" className="text-xs text-emerald-300 hover:underline">
                Open Session
              </Link>
            </div>
            {nextStep ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-slate-200">
                <p className="text-xs uppercase text-amber-300">Pending step</p>
                <p className="font-semibold text-white">{nextStep.contact?.name || "Contact"}</p>
                <p className="text-xs text-slate-400">
                  {nextStep.channel} · {nextStep.content.slice(0, 140)}
                </p>
                <p className="text-[11px] text-slate-500">Due {nextStep.scheduledAt ? formatDate(nextStep.scheduledAt) : "soon"}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <Link
                    href={`/projects/${project.id}/workspace?contactId=${nextStep.contact?.id ?? ""}&stepId=${nextStep.id}`}
                    className="rounded border border-white/10 px-3 py-1 text-slate-200 hover:border-white/20"
                  >
                    Focus in workspace
                  </Link>
                  <Link
                    href={`/session?projectId=${project.id}`}
                    className="rounded border border-white/10 px-3 py-1 text-emerald-200 hover:border-white/20"
                  >
                    Open in Session
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                No pending steps. Create a sequence or add a contact to start outreach.
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Contacts & buying committee</p>
                <p className="text-xs text-slate-500">Suggested contacts, decision-makers, current owners.</p>
              </div>
              <Link href={`/projects/${project.id}/contact-workbench`} className="text-xs text-emerald-300 hover:underline">
                Legacy Workbench
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <SectionHeader title="Confirmed contacts" helper={`${project.contacts.length} contact(s)`} className="mb-1" />
                <div className="space-y-2 text-sm text-slate-200">
                  {project.contacts.map((c) => (
                    <div key={c.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="font-semibold text-white">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.role}</p>
                      {c.channelPreference ? <p className="text-[11px] text-emerald-300">Prefers {c.channelPreference}</p> : null}
                      {c.persona ? <p className="text-[11px] text-slate-300">Persona: {c.persona}</p> : null}
                      <div className="mt-2 text-[11px] text-slate-400 space-y-1">
                        {c.email ? <p>Email: {c.email}</p> : null}
                        {c.linkedinUrl ? <p>LinkedIn: {c.linkedinUrl}</p> : null}
                        {c.twitterHandle ? <p>Twitter: {c.twitterHandle}</p> : null}
                        {c.telegram ? <p>Telegram: {c.telegram}</p> : null}
                      </div>
                      <div className="mt-2">
                        <ContactPersonaSelect projectId={project.id} contactId={c.id} value={c.persona} />
                      </div>
                </div>
              ))}
              {project.contacts.length === 0 ? <p className="text-slate-500">No contacts yet.</p> : null}
            </div>
            <ContactCaptureForm
              defaultProjectId={project.id}
              compact
              refreshOnSuccess
            />
          </div>
              <div className="space-y-3">
                <AIContactFinder projectId={project.id} />
              </div>
            </div>
            {selectedContact ? (
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <SectionHeader title="Sequence / steps" helper={selectedContact.sequence?.steps.length ? `${selectedContact.sequence.steps.length} steps` : "No sequence"} />
                {selectedContact.sequence?.steps.length ? (
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
                ) : (
                  <p className="text-slate-500">No sequence for this contact yet.</p>
                )}
                <div className="mt-3">
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
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Sequence builder</p>
              {selectedContact ? <p className="text-xs text-slate-500">Selected: {selectedContact.name}</p> : null}
            </div>
            <SequenceBuilder
              projectId={project.id}
              contacts={project.contacts.map((c) => ({ id: c.id, name: c.name, role: c.role }))}
              playbooks={[]}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
