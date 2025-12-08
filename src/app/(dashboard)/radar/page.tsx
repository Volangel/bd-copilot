import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RadarCard } from "@/components/radar-card";
import { PageHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, TagPill } from "@/components/ui/badge";
import { MetricsCard } from "@/app/(dashboard)/today/components/MetricsCard";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { parseJsonString } from "@/lib/parsers";

const reviewableWhere = (userId: string, now: Date) => ({
  userId,
  OR: [{ status: "NEW" }, { status: "SNOOZED", nextReviewAt: { lte: now } }],
});

async function getReviewableOpportunities(userId: string, now: Date) {
  return prisma.opportunity.findMany({
    where: reviewableWhere(userId, now),
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });
}

async function getAllOpportunities(userId: string) {
  return prisma.opportunity.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    take: 400,
  });
}

export default async function RadarPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const now = new Date();
  const reviewable = await getReviewableOpportunities(session.user.id, now);
  const allOpps = await getAllOpportunities(session.user.id);
  const sorted = [...reviewable].sort((a, b) => {
    const leadDiff = (b.leadScore ?? -1) - (a.leadScore ?? -1);
    if (leadDiff !== 0) return leadDiff;
    const icpDiff = (b.icpScore ?? -1) - (a.icpScore ?? -1);
    if (icpDiff !== 0) return icpDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const topPicks = sorted.slice(0, 10);
  const chips = [
    { label: "Top picks", value: topPicks.length },
    { label: "Lead review queue", value: reviewable.length },
  ];
  const metrics = [
    { label: "Reviewable leads", value: reviewable.length, helper: "NEW + due snoozed" },
    { label: "Top picks", value: topPicks.length, helper: "Highest scored" },
    { label: "All opportunities", value: allOpps.length, helper: "Across every status" },
  ];
  const progressLabel = reviewable.length > 0 ? `Lead review queue: ${reviewable.length} ready` : "Lead review queue empty";
  const quickActions = [
    { label: "Scan sources", href: "/discover/scan" },
    { label: "Start lead review", href: "/leads/review", tone: "primary" },
  ];

  if (allOpps.length === 0) {
    return (
      <>
        <PageHeader title="Lead Radar" description="Ranked opportunities by lead score, ICP fit, and signals." mode="discover" />
        <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-8 shadow-lg shadow-black/20">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="text-3xl">🛰️</div>
            <p className="text-lg font-semibold text-white">No radar signals yet</p>
            <p className="text-sm text-slate-400">Paste some text or scan a page/watchlist to discover leads.</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <Link href="/discover/scan" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-emerald-200 transition hover:bg-white/10">
                Scan text
              </Link>
              <Link href="/discover/scan" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-emerald-200 transition hover:bg-white/10">
                Scan page
              </Link>
              <Link href="/settings/watchlist" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-emerald-200 transition hover:bg-white/10">
                Manage watchlist
              </Link>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Lead Radar"
        description="Ranked opportunities by lead score, ICP fit, and signals."
        mode="discover"
        actions={
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  action.tone === "primary"
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300 hover:bg-emerald-500/20"
                    : "border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((m) => (
          <MetricsCard key={m.label} title={m.label} value={m.value} helper={m.helper} />
        ))}
      </div>

      <Card className="space-y-4 border-white/10 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent px-6 py-5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
          {chips.map((c) => (
            <span key={c.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {c.label}: <span className="font-semibold text-white">{c.value}</span>
            </span>
          ))}
          <Link
            href="/leads/review"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/20"
          >
            {progressLabel}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {topPicks.map((opp) => (
            <RadarCard key={opp.id} opp={opp} />
          ))}
          {topPicks.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
              <div className="text-2xl">🛰️</div>
              <p className="mt-2 text-lg font-semibold text-white">No top picks yet</p>
              <p className="text-sm text-slate-400">Run a scan to populate your radar.</p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">All opportunities</p>
          <p className="text-xs text-slate-400">{allOpps.length} items</p>
        </div>
        <Table>
          <TableHeader>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Lead</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Scores</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Tags</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Actions</th>
            </tr>
          </TableHeader>
          <tbody>
            {allOpps.map((opp) => {
              const tags = parseJsonString<string[]>(opp.tags, []);
              const status = opp.status || "NEW";
              return (
                <TableRow key={opp.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link href={opp.url} target="_blank" className="text-sm font-semibold text-white hover:text-emerald-300">
                        {opp.title || opp.url}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {opp.sourceType}
                        {opp.sourceLabel ? ` · ${opp.sourceLabel}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        {status === "NEW" ? <Badge variant="info">New</Badge> : null}
                        {status === "SNOOZED" ? (
                          <Badge variant="warning">
                            Snoozed{opp.nextReviewAt ? ` until ${opp.nextReviewAt.toLocaleDateString()}` : ""}
                          </Badge>
                        ) : null}
                        {status === "DISCARDED" ? <Badge variant="neutral">Not relevant</Badge> : null}
                        {status === "CONVERTED" ? (
                          opp.projectId ? (
                            <Link href={`/projects/${opp.projectId}/workspace`} className="text-emerald-300 hover:underline">
                              <Badge variant="success">Converted → Project</Badge>
                            </Link>
                          ) : (
                            <Badge variant="success">Converted</Badge>
                          )
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-200">
                      <Badge variant="info">Lead {opp.leadScore ?? "–"}</Badge>
                      <Badge variant="neutral">ICP {opp.icpScore ?? "–"}</Badge>
                      <Badge variant="neutral">MQA {opp.mqaScore ?? "–"}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tags.length ? tags.map((t) => <TagPill key={t}>{t}</TagPill>) : <p className="text-xs text-slate-500">No tags</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/leads/review?id=${opp.id}`}
                        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/10"
                      >
                        Review
                      </Link>
                      <Link
                        href={opp.url}
                        target="_blank"
                        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                </TableRow>
              );
            })}
            {allOpps.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  No opportunities found. Run a scan to populate this table.
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
