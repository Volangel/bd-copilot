import { NoteForm } from "@/components/projects/note-form";
import { ProjectStatusForm } from "@/components/projects/status-form";
import { InteractionForm } from "@/components/projects/interaction-form";
import { authOptions } from "@/lib/auth";
import { parseJsonString } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountHero } from "@/components/account/account-hero";
import { AccountTabs } from "@/components/account/account-tabs";
import { ProjectDetailsCard } from "@/components/account/project-details-card";
import { ContactsTab } from "@/components/account/contacts-tab";
import { enrichExistingProjectFromUrl } from "@/lib/projects/enrichProject";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function updateProjectMeta(projectId: string, formData: FormData) {
  "use server";
  const name = (formData.get("name") as string) || null;
  const stage = (formData.get("stage") as string) || null;
  const summary = (formData.get("summary") as string) || null;
  const targetUsers = (formData.get("targetUsers") as string) || null;
  const painPoints = (formData.get("painPoints") as string) || null;
  const tagsRaw = (formData.get("tags") as string) || "";
  const twitter = (formData.get("twitter") as string) || null;
  const telegram = (formData.get("telegram") as string) || null;
  const discord = (formData.get("discord") as string) || null;
  const github = (formData.get("github") as string) || null;
  const medium = (formData.get("medium") as string) || null;

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      stage,
      summary,
      targetUsers,
      painPoints,
      categoryTags: tags.length ? JSON.stringify(tags) : null,
      twitter,
      telegram,
      discord,
      github,
      medium,
    },
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/projects/${projectId}`);
}

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      contacts: {
        include: {
          outreach: { orderBy: { createdAt: "desc" } },
          interactions: { orderBy: { occurredAt: "desc" }, take: 3 },
        },
      },
      outreach: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      interactions: { orderBy: { occurredAt: "desc" }, where: { userId: session.user.id }, take: 50 },
      sequences: {
        include: {
          steps: true,
        },
      },
    },
  });

  const templates = await prisma.template.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!project) {
    notFound();
  }

  async function enrichProject() {
    "use server";
    const { revalidatePath } = await import("next/cache");
    try {
      await enrichExistingProjectFromUrl({ projectId: id, userId: session.user.id });
    } catch (err) {
      console.error("[enrichProject action] failed", err);
    }
    revalidatePath(`/projects/${id}`);
  }

  const tags = parseJsonString<string[]>(project.categoryTags, []);
  const bdAngles = parseJsonString<string[]>(project.bdAngles, []);
  const nextTouch =
    project.sequences
      .flatMap((s) => s.steps)
      .filter((st) => st.status === "PENDING" && st.scheduledAt)
      .sort((a, b) => (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0))[0]?.scheduledAt || null;
  const activeSequenceCount = project.sequences.length;


  const overviewTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <ProjectDetailsCard projectId={project.id} project={project} tags={tags} action={updateProjectMeta.bind(null, project.id)} />
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Insights</p>
              <Badge variant="outline">Signals</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target users</p>
                <p className="text-sm text-slate-200">{project.targetUsers || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pain points</p>
                <p className="text-sm text-slate-200">{project.painPoints || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">BD Angles</p>
                <div className="mt-2 space-y-1 text-sm text-slate-200">
                  {bdAngles.length > 0 ? bdAngles.map((angle, idx) => <p key={idx}>• {angle}</p>) : <p>—</p>}
                </div>
              </div>
            </div>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="space-y-3">
            <SectionHeader title="Official links" />
            <div className="space-y-2 text-xs">
              {project.twitter ? (
                <a href={project.twitter} target="_blank" className="block rounded border border-slate-800 px-3 py-2 text-emerald-300 hover:border-slate-600">
                  Twitter / X
                </a>
              ) : null}
              {project.telegram ? (
                <a href={project.telegram} target="_blank" className="block rounded border border-slate-800 px-3 py-2 text-emerald-300 hover:border-slate-600">
                  Telegram
                </a>
              ) : null}
              {project.discord ? (
                <a href={project.discord} target="_blank" className="block rounded border border-slate-800 px-3 py-2 text-emerald-300 hover:border-slate-600">
                  Discord
                </a>
              ) : null}
              {project.github ? (
                <a href={project.github} target="_blank" className="block rounded border border-slate-800 px-3 py-2 text-emerald-300 hover:border-slate-600">
                  GitHub
                </a>
              ) : null}
              {project.medium ? (
                <a href={project.medium} target="_blank" className="block rounded border border-slate-800 px-3 py-2 text-emerald-300 hover:border-slate-600">
                  Medium
                </a>
              ) : null}
              {!project.twitter && !project.telegram && !project.discord && !project.github && !project.medium ? (
                <p className="text-slate-500">No links detected.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  const contactsTab = (
    <ContactsTab
      projectId={project.id}
      projectName={project.name || project.url}
      contacts={project.contacts}
      templates={templates}
      outreachLog={project.outreach}
    />
  );

  const notesTab = (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 space-y-4 lg:col-span-7">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">Notes</p>
            <p className="text-xs text-slate-500">{project.notes.length} entries</p>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            {project.notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-slate-200">{note.content}</p>
                <p className="text-[11px] text-slate-500">{formatDate(note.createdAt)}</p>
              </div>
            ))}
            {project.notes.length === 0 ? <p className="text-slate-500">No notes yet.</p> : null}
          </div>
          <div className="pt-2">
            <NoteForm projectId={project.id} />
          </div>
        </Card>
      </div>
      <div className="col-span-12 space-y-4 lg:col-span-5">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">Interactions</p>
            <p className="text-xs text-slate-500">{project.interactions.length} logged</p>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
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
          <div className="pt-2">
            <InteractionForm projectId={project.id} contacts={project.contacts} />
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 px-8 py-10 md:py-12 lg:px-10 xl:max-w-6xl xl:mx-auto">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        This view is being replaced by the Account Workspace.{" "}
        <Link href={`/projects/${project.id}/workspace`} className="text-emerald-200 underline">
          Open Workspace
        </Link>
      </div>
      <PageHeader
        title="Account 360°"
        description="Project overview and actions"
        actions={
          <form action={enrichProject}>
            <button
              type="submit"
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-white disabled:opacity-50"
              disabled={!project.url}
              title={project.url ? "Fetch site and re-enrich analysis" : "Add a URL to enable enrichment"}
            >
              Enrich from URL
            </button>
          </form>
        }
      />

      <AccountHero
        name={project.name}
        url={project.url}
        stage={project.stage}
        status={project.status}
        icpScore={project.icpScore}
        mqaScore={project.mqaScore}
        sequenceCount={activeSequenceCount}
        nextTouch={nextTouch}
        projectId={project.id}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-4 lg:col-span-8">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Summary</p>
              <Badge variant="outline">AI analysis</Badge>
            </div>
            <p className="text-sm text-slate-300">{project.summary || "No summary yet."}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {project.icpScore ? <Badge variant="neutral">ICP {project.icpScore}</Badge> : null}
              {project.mqaScore ? <Badge variant="neutral">MQA {project.mqaScore}</Badge> : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-200">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="bg-[#1E2022]">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-white">Status & next follow-up</p>
            <ProjectStatusForm
              projectId={project.id}
              status={project.status}
              nextFollowUpAt={project.nextFollowUpAt ? project.nextFollowUpAt.toISOString() : null}
            />
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <Badge variant="outline">Last contact {project.lastContactAt ? formatDate(project.lastContactAt) : "—"}</Badge>
              {nextTouch ? <Badge variant="info">Next touch {formatDate(nextTouch)}</Badge> : <Badge variant="outline">No next touch</Badge>}
            </div>
            <Link
              href="/session"
              className="flex w-full items-center justify-center rounded-md border border-[#6366F1] bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#7C82F6]"
            >
              Open Session
            </Link>
          </Card>
        </div>
      </div>

      <AccountTabs overview={overviewTab} contacts={contactsTab} notes={notesTab} />
    </div>
  );
}
