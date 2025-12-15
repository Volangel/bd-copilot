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
import Link from "next/link";

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
  type PlaybookType = (typeof playbooks)[number];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playbooks"
        description="Boost or penalize leads based on keywords (chains, verticals, GTM plays)."
        mode="other"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
            <Link
              href="/settings/watchlist"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Watchlist
            </Link>
          </div>
        }
      />

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{playbooks.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total playbooks</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-emerald-500/[0.08] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{playbooks.reduce((acc: number, pb: PlaybookType) => acc + parseJsonString<string[]>(pb.boosts, []).length, 0)}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Boost keywords</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-red-500/[0.08] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/15">
            <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{playbooks.reduce((acc: number, pb: PlaybookType) => acc + parseJsonString<string[]>(pb.penalties, []).length, 0)}</p>
            <p className="text-[10px] text-red-400/70 uppercase tracking-wide">Penalty keywords</p>
          </div>
        </div>
      </div>

      {/* Create form */}
      <Card className="rounded-xl border border-white/10 bg-gradient-to-br from-[#0F1116] to-[#0B0C10] px-6 py-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white">Create New Playbook</p>
            <p className="text-xs text-slate-500">Define keywords to prioritize or deprioritize leads</p>
          </div>
        </div>
        <form action={savePlaybook.bind(null, userId)} className="space-y-4 text-sm text-slate-200">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Name</label>
              <input name="name" required className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30" placeholder="Security-focused" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Boost keywords (comma separated)</label>
              <input name="boosts" className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30" placeholder="audit, security, compliance" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Penalty keywords (comma separated)</label>
              <input name="penalties" className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30" placeholder="meme, casino" />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/25"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create playbook
          </button>
        </form>
      </Card>

      {/* Playbooks list */}
      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 ring-1 ring-slate-500/30">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-white">Your Playbooks</p>
              <p className="text-xs text-slate-500">{playbooks.length} playbook{playbooks.length !== 1 ? "s" : ""} configured</p>
            </div>
          </div>
        </div>
        {playbooks.length === 0 ? (
          <EmptyState
            title="No playbooks yet"
            description="Create a playbook to boost or penalize leads based on keywords."
            icon="📒"
            primaryAction={{ label: "Create your first playbook", href: "/settings/playbooks" }}
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Boosts</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Penalties</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </TableHeader>
            <tbody>
              {playbooks.map((pb: PlaybookType) => {
                const boosts = parseJsonString<string[]>(pb.boosts, []);
                const penalties = parseJsonString<string[]>(pb.penalties, []);
                return (
                  <TableRow key={pb.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-sm font-semibold text-white">{pb.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-200">
                      <div className="flex flex-wrap gap-1">
                        {boosts.length ? boosts.map((b: string) => <Badge key={b} variant="success">{b}</Badge>) : <span className="text-slate-500">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200">
                      <div className="flex flex-wrap gap-1">
                        {penalties.length ? penalties.map((p: string) => <Badge key={p} variant="danger">{p}</Badge>) : <span className="text-slate-500">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deletePlaybook.bind(null, userId, pb.id)}>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-200"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
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
