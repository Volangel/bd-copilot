import { authOptions } from "@/lib/auth";
import { autoDetectContacts } from "@/lib/contact-workbench/autoDetectContacts";
import { prisma } from "@/lib/prisma";
import { ContactCaptureForm } from "@/components/contacts/contact-capture-form";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SequenceBuilder from "./sequence-builder";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { AIContactFinder } from "./ai-contact-finder";

async function autoAddContacts(projectId: string, userId: string) {
  "use server";
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) return;
  const existing = await prisma.contact.findMany({ where: { projectId } });
  const existingNames = new Set(existing.map((c) => (c.name || "").toLowerCase()));
  const candidates = await autoDetectContacts(project.url);
  const toCreate = candidates.filter((c) => c.name && !existingNames.has(c.name.toLowerCase()));
  if (toCreate.length === 0) return;
  for (const c of toCreate) {
    await prisma.contact.create({
      data: {
        projectId,
        name: c.name || "Unknown",
        role: c.role || null,
        linkedinUrl: c.linkedinUrl || null,
        twitterHandle: c.twitterHandle || null,
        telegram: c.telegram || null,
        channelPreference: null,
      },
    });
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/projects/${projectId}/contact-workbench`);
}

export default async function ContactWorkbench({ params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { contacts: true },
  });
  if (!project) redirect("/projects");

  const candidates = await autoDetectContacts(project.url);
  const playbooks = await prisma.playbook.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Contact Workbench now lives inside the Account Workspace.{" "}
        <Link href={`/projects/${project.id}/workspace`} className="text-emerald-200 underline">
          Open Workspace
        </Link>
      </div>
      <PageHeader
        title="Contact Workbench"
        description={`Detect and enrich decision-makers for ${project.name || project.url}`}
        mode="pipeline"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${project.id}/workspace`}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Workspace
            </Link>
            <Link
              href={`/projects/${id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Project
            </Link>
          </div>
        }
      />

      {/* Metrics row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-blue-500/[0.08] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/15">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{project.contacts.length}</p>
            <p className="text-[10px] text-blue-400/70 uppercase tracking-wide">Confirmed</p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${candidates.length > 0 ? "bg-emerald-500/[0.08]" : "bg-white/[0.02]"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{candidates.length}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Detected</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-4 lg:col-span-8">
          <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <SectionHeader title="Confirmed contacts" helper={`${project.contacts.length} contact(s)`} />
              <form action={autoAddContacts.bind(null, id, userId)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Auto-detect
                </button>
              </form>
            </div>
            {project.contacts.length === 0 ? (
              <EmptyState
                title="No contacts for this account yet"
                description="Detect team members from the site or add one manually."
                icon="👤"
              />
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Channels</th>
                    <th className="px-4 py-3">Preference</th>
                  </tr>
                </TableHeader>
                <tbody>
                  {project.contacts.map((c) => (
                    <TableRow key={c.id}>
                      <td className="px-4 py-3 text-sm text-slate-100">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-200">{c.role}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {c.email ? <p>Email: {c.email}</p> : null}
                        {c.linkedinUrl ? <p>LinkedIn: {c.linkedinUrl}</p> : null}
                        {c.twitterHandle ? <p>Twitter: {c.twitterHandle}</p> : null}
                        {c.telegram ? <p>Telegram: {c.telegram}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{c.channelPreference || "-"}</td>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
            <SectionHeader title="Auto-detected team" />
            <div className="mt-3 space-y-3">
              {candidates.map((c, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-[#0F1012] p-3">
                  <ContactCaptureForm defaultProjectId={id} compact defaultName={c.name || undefined} defaultRole={c.role || undefined} refreshOnSuccess />
                </div>
              ))}
              {candidates.length === 0 ? <p className="text-xs text-slate-500">No contacts detected.</p> : null}
            </div>
          </Card>

          <Card className="space-y-3 rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
            <SectionHeader title="Manual quick add" />
            <ContactCaptureForm defaultProjectId={id} compact refreshOnSuccess />
          </Card>
          <Card className="space-y-3 rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
            <AIContactFinder projectId={id} />
          </Card>
        </div>

        <div className="col-span-12 space-y-4 lg:col-span-4">
          <Card className="h-full rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
            <SectionHeader title="Sequence Builder" />
            <SequenceBuilder
              projectId={id}
              contacts={project.contacts.map((c) => ({ id: c.id, name: c.name, role: c.role }))}
              playbooks={playbooks.map((p) => ({ id: p.id, name: p.name }))}
            />
          </Card>
          <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
            <SectionHeader title="Target persona suggestions" />
            <div className="mt-2 space-y-2 text-xs text-slate-300">
              <p>Primary: Founder/CTO</p>
              <p>Secondary: Tech Lead</p>
              <p>Fallback: BD/Partnerships Lead</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
