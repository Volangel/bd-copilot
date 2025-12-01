import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import { PrimaryButton, GhostButton } from "@/components/ui/buttons";

async function addWatchlist(userId: string, formData: FormData) {
  "use server";
  const url = (formData.get("url") as string) || "";
  const label = (formData.get("label") as string) || "";
  if (!url.startsWith("http")) return;
  await prisma.watchlistUrl.create({
    data: { userId, url, label: label || null },
  });
}

async function deleteWatchlist(userId: string, id: string) {
  "use server";
  await prisma.watchlistUrl.deleteMany({ where: { id, userId } });
}

export default async function WatchlistPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const watchlist = prisma.watchlistUrl
    ? await prisma.watchlistUrl.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    : [];

  const addAction = addWatchlist.bind(null, userId);

  return (
    <div className="flex flex-col gap-6 px-8 py-10 md:py-12 lg:px-10 xl:max-w-5xl xl:mx-auto">
      <PageHeader title="Watchlist URLs" description="Curate sources to scan regularly (news pages, listings, etc.)." mode="discover" />

      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <form action={addAction} className="space-y-3 text-sm text-slate-200">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">Label (optional)</label>
              <input name="label" className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="Arbitrum projects" />
            </div>
            <div>
              <label className="text-xs text-slate-400">URL</label>
              <input name="url" required className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="https://example.com/projects" />
            </div>
          </div>
          <PrimaryButton type="submit" className="px-4 py-2">
            Add to watchlist
          </PrimaryButton>
        </form>
      </Card>

      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Watchlist</h2>
        {watchlist.length === 0 ? (
          <EmptyState
            title="No watchlist URLs yet"
            description="Add a few sources to keep your lead radar fresh."
            icon="📡"
            primaryAction={{ label: "Add source", href: "/settings/watchlist" }}
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </TableHeader>
            <tbody>
              {watchlist.map((item) => {
                const deleteAction = deleteWatchlist.bind(null, userId, item.id);
                return (
                  <TableRow key={item.id}>
                    <td className="px-4 py-3 text-sm text-slate-100">{item.label || "Untitled"}</td>
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
                        <GhostButton className="border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-red-400">Delete</GhostButton>
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
