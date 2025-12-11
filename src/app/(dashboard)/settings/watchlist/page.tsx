import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import { PrimaryButton, GhostButton } from "@/components/ui/buttons";
import Link from "next/link";

async function addWatchlist(userId: string, formData: FormData) {
  "use server";
  const urlInput = (formData.get("url") as string) || "";
  const label = (formData.get("label") as string) || "";
  // Validate URL format properly
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlInput);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return;
  } catch {
    return;
  }
  await prisma.watchlistUrl.create({
    data: { userId, url: parsedUrl.href, label: label || null },
  });
}

async function deleteWatchlist(userId: string, id: string) {
  "use server";
  const item = await prisma.watchlistUrl.findFirst({ where: { id, userId } });
  if (!item) return;
  await prisma.watchlistUrl.delete({ where: { id } });
}

export default async function WatchlistPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const watchlist = prisma.watchlistUrl
    ? await prisma.watchlistUrl.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    : [];

  const addAction = addWatchlist.bind(null, userId);

  // Group by domain for stats
  const domains = new Set(watchlist.map((item) => {
    try {
      return new URL(item.url).hostname;
    } catch {
      return "unknown";
    }
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlist URLs"
        description="Curate sources to scan regularly (news pages, listings, etc.)."
        mode="discover"
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
              href="/settings/playbooks"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Playbooks
            </Link>
            <Link
              href="/discover/scan-watchlist"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Scan Watchlist
            </Link>
          </div>
        }
      />

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{watchlist.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total URLs</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-blue-500/[0.08] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/15">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{domains.size}</p>
            <p className="text-[10px] text-blue-400/70 uppercase tracking-wide">Unique domains</p>
          </div>
        </div>

        <Link
          href="/discover/scan-watchlist"
          className="flex items-center gap-3 rounded-lg bg-emerald-500/[0.08] px-4 py-2.5 transition-colors hover:bg-emerald-500/[0.12]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-100">Scan all</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Run scan</p>
          </div>
        </Link>
      </div>

      {/* Add URL form */}
      <Card className="rounded-xl border border-white/10 bg-gradient-to-br from-[#0F1116] to-[#0B0C10] px-6 py-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white">Add Watchlist URL</p>
            <p className="text-xs text-slate-500">Add a URL to monitor for new opportunities</p>
          </div>
        </div>
        <form action={addAction} className="space-y-4 text-sm text-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Label (optional)</label>
              <input name="label" className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30" placeholder="Arbitrum projects" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">URL</label>
              <input name="url" required className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] px-3 py-2.5 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30" placeholder="https://example.com/projects" />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/60 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/25"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add to watchlist
          </button>
        </form>
      </Card>

      {/* Watchlist table */}
      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 ring-1 ring-slate-500/30">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-white">Your Watchlist</p>
              <p className="text-xs text-slate-500">{watchlist.length} URL{watchlist.length !== 1 ? "s" : ""} being monitored</p>
            </div>
          </div>
        </div>
        {watchlist.length === 0 ? (
          <EmptyState
            title="No watchlist URLs yet"
            description="Add a few sources to keep your lead radar fresh."
            icon="📡"
            primaryAction={{ label: "Add your first URL", href: "/settings/watchlist" }}
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Label</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">URL</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </TableHeader>
            <tbody>
              {watchlist.map((item) => {
                const deleteAction = deleteWatchlist.bind(null, userId, item.id);
                return (
                  <TableRow key={item.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-sm font-medium text-slate-100">{item.label || "Untitled"}</td>
                    <td className="px-4 py-3 text-xs">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-300 hover:underline"
                        title={item.url}
                      >
                        {item.url.length > 60 ? `${item.url.slice(0, 57)}…` : item.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteAction}>
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
