import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RadarCard } from "@/components/radar-card";
import { PageHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, TagPill } from "@/components/ui/badge";
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
  type OppType = (typeof allOpps)[number];
  const sorted = [...reviewable].sort((a: OppType, b: OppType) => {
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

      {/* Metrics row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-blue-500/[0.08] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/15">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{reviewable.length}</p>
            <p className="text-[10px] text-blue-400/70 uppercase tracking-wide">Reviewable</p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${topPicks.length > 0 ? "bg-emerald-500/[0.08]" : "bg-white/[0.02]"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{topPicks.length}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Top picks</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{allOpps.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">All opportunities</p>
          </div>
        </div>
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
          {topPicks.map((opp: OppType) => (
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
            {allOpps.map((opp: OppType) => {
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
