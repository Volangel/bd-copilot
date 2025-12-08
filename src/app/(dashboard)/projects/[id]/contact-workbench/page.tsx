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
    <>
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Contact Workbench now lives inside the Account Workspace.{" "}
        <Link href={`/projects/${project.id}/workspace`} className="text-emerald-200 underline">
          Open Workspace
        </Link>
      </div>
      <PageHeader
        title="Contact Workbench"
        description={`Detect and enrich decision-makers for ${project.name || project.url}`}
        actions={
          <Link href={`/projects/${id}`} className="text-sm text-emerald-300 hover:underline">
            Back to Project
          </Link>
        }
      />

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-4 lg:col-span-8">
              <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <SectionHeader title="Confirmed contacts" helper={`${project.contacts.length} contact(s)`} />
              <form action={autoAddContacts.bind(null, id, userId)}>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
                >
                  Auto-detect contacts
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
    </>
  );
}
