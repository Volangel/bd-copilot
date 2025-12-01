import { authOptions } from "@/lib/auth";
import { parseJsonString, serializeJson } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { PrimaryButton, GhostButton } from "@/components/ui/buttons";

async function savePlaybook(userId: string, formData: FormData, id?: string) {
  "use server";
  const name = (formData.get("name") as string) || "";
  const boostsRaw = (formData.get("boosts") as string) || "";
  const penaltiesRaw = (formData.get("penalties") as string) || "";
  const boosts = boostsRaw
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  const penalties = penaltiesRaw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!name) return;

  if (id) {
    await prisma.playbook.updateMany({
      where: { id, userId },
      data: { name, boosts: serializeJson(boosts), penalties: serializeJson(penalties) },
    });
  } else {
    await prisma.playbook.create({
      data: { userId, name, boosts: serializeJson(boosts), penalties: serializeJson(penalties) },
    });
  }
}

async function deletePlaybook(userId: string, id: string) {
  "use server";
  await prisma.playbook.deleteMany({ where: { id, userId } });
}

export default async function PlaybooksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const playbooks = await prisma.playbook.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6 px-8 py-10 md:py-12 lg:px-10 xl:max-w-5xl xl:mx-auto">
      <PageHeader title="Playbooks" description="Boost or penalize leads based on keywords (chains, verticals, GTM plays)." />

      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <form action={savePlaybook.bind(null, userId)} className="space-y-3 text-sm text-slate-200">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-400">Name</label>
              <input name="name" required className="mt-1 w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2 text-sm text-white" placeholder="Security-focused" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Boost keywords (comma separated)</label>
              <input name="boosts" className="mt-1 w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2 text-sm text-white" placeholder="audit, security, compliance" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Penalty keywords (comma separated)</label>
              <input name="penalties" className="mt-1 w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2 text-sm text-white" placeholder="meme, casino" />
            </div>
          </div>
          <PrimaryButton type="submit" className="px-4 py-2">
            Create playbook
          </PrimaryButton>
        </form>
      </Card>

      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Playbooks</h2>
        {playbooks.length === 0 ? (
          <EmptyState
            title="No playbooks yet"
            description="Create a playbook to boost or penalize leads."
            icon="📒"
            primaryAction={{ label: "New playbook", href: "/settings/playbooks" }}
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Boosts</th>
                <th className="px-4 py-3">Penalties</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </TableHeader>
            <tbody>
              {playbooks.map((pb) => {
                const boosts = parseJsonString<string[]>(pb.boosts, []);
                const penalties = parseJsonString<string[]>(pb.penalties, []);
                return (
                  <TableRow key={pb.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-sm font-semibold text-white">{pb.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-200">
                      {boosts.length ? boosts.map((b) => <Badge key={b} variant="success">{b}</Badge>) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200">
                      {penalties.length ? penalties.map((p) => <Badge key={p} variant="danger">{p}</Badge>) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deletePlaybook.bind(null, userId, pb.id)}>
                        <GhostButton className="border border-white/10 px-3 py-2 text-xs text-slate-200 hover:border-red-400">Delete</GhostButton>
                      </form>
                    </td>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
