import { OpportunityActions } from "@/components/discovery/opportunity-actions";
import { authOptions } from "@/lib/auth";
import { parseJsonString } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { Badge, TagPill } from "@/components/ui/badge";
import { MetricsCard } from "@/app/(dashboard)/today/components/MetricsCard";

const STATUS_TABS = [
  { key: "NEW", label: "New" },
  { key: "CONVERTED", label: "Converted" },
  { key: "DISCARDED", label: "Discarded" },
  { key: "ALL", label: "All" },
];

const SORT_OPTIONS = [
  { key: "mqa", label: "MQA priority" },
  { key: "icp", label: "ICP strength" },
  { key: "recent", label: "Most recent" },
];

const parseNumberParam = (value: string | undefined) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = searchParams || {};
  const rawStatus = typeof params?.status === "string" ? params.status : "NEW";
  const statusParam = STATUS_TABS.some((tab) => tab.key === rawStatus) ? rawStatus : "NEW";
  const rawSort = typeof params?.sort === "string" ? params.sort : "mqa";
  const sortParam = SORT_OPTIONS.some((opt) => opt.key === rawSort) ? rawSort : "mqa";
  const sourceParam = typeof params?.source === "string" ? params.source : undefined;
  const tagParam = typeof params?.tag === "string" ? params.tag : undefined;
  const minMqa = parseNumberParam(typeof params?.minMqa === "string" ? params.minMqa : undefined);
  const minIcp = parseNumberParam(typeof params?.minIcp === "string" ? params.minIcp : undefined);
  const minLead = parseNumberParam(typeof params?.minLead === "string" ? params.minLead : undefined);
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const where = {
    userId: session.user.id,
    ...(statusParam && statusParam !== "ALL" ? { status: statusParam } : {}),
    ...(sourceParam ? { sourceType: sourceParam } : {}),
    ...(tagParam ? { tags: { contains: tagParam } } : {}),
    ...(minMqa !== null ? { mqaScore: { gte: minMqa } } : {}),
    ...(minIcp !== null ? { icpScore: { gte: minIcp } } : {}),
    ...(minLead !== null ? { leadScore: { gte: minLead } } : {}),
  } as const;

  const orderBy = (() => {
    switch (sortParam) {
      case "recent":
        return [{ createdAt: "desc" }] as const;
      case "icp":
        return [
          { icpScore: "desc" },
          { mqaScore: "desc" },
          { createdAt: "desc" },
        ] as const;
      default:
        return [
          { mqaScore: "desc" },
          { icpScore: "desc" },
          { createdAt: "desc" },
        ] as const;
    }
  })();

  const [opportunities, sourceTypes, allStats] = await Promise.all([
    prisma.opportunity.findMany({ where, orderBy }),
    prisma.opportunity.findMany({
      where: { userId: session.user.id },
      select: { sourceType: true },
      distinct: ["sourceType"],
      orderBy: { sourceType: "asc" },
    }),
    prisma.opportunity.groupBy({
      by: ["status"],
      where: { userId: session.user.id },
      _count: { id: true },
    }),
  ]);

  // Calculate stats
  type StatRow = (typeof allStats)[number];
  const statsMap = Object.fromEntries(allStats.map((s: StatRow) => [s.status, s._count.id]));
  const totalOpps = Object.values(statsMap).reduce((a, b) => a + b, 0);
  const newCount = statsMap["NEW"] || 0;
  const convertedCount = statsMap["CONVERTED"] || 0;
  const discardedCount = statsMap["DISCARDED"] || 0;
  const snoozedCount = statsMap["SNOOZED"] || 0;
  const highMqaCount = await prisma.opportunity.count({ where: { userId: session.user.id, mqaScore: { gte: 70 } } });

  const sharedParams = new URLSearchParams();
  if (sourceParam) sharedParams.set("source", sourceParam);
  if (tagParam) sharedParams.set("tag", tagParam);
  if (minMqa !== null) sharedParams.set("minMqa", String(minMqa));
  if (minIcp !== null) sharedParams.set("minIcp", String(minIcp));
  if (minLead !== null) sharedParams.set("minLead", String(minLead));
  if (sortParam && sortParam !== "mqa") sharedParams.set("sort", sortParam);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discovery Feed"
        description="Ranked opportunities from scans. Convert or discard."
        mode="discover"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/discover/scan"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Scan new opportunities
            </Link>
            <Link
              href="/radar"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Lead Radar
            </Link>
          </div>
        }
      />

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{totalOpps}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total</p>
          </div>
        </div>

        <Link
          href="/discover?status=NEW"
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${newCount > 0 ? "bg-blue-500/[0.08] hover:bg-blue-500/[0.12] cursor-pointer" : "bg-white/[0.02]"}`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/15 relative">
            {newCount > 0 && <span className="absolute h-2 w-2 rounded-full bg-blue-400 animate-ping opacity-75" />}
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{newCount}</p>
            <p className="text-[10px] text-blue-400/70 uppercase tracking-wide">New</p>
          </div>
        </Link>

        <Link
          href="/discover?status=CONVERTED"
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${convertedCount > 0 ? "bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12] cursor-pointer" : "bg-white/[0.02]"}`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{convertedCount}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Converted</p>
          </div>
        </Link>

        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${highMqaCount > 0 ? "bg-purple-500/[0.08] hover:bg-purple-500/[0.12]" : "bg-white/[0.02]"}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/15">
            <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{highMqaCount}</p>
            <p className="text-[10px] text-purple-400/70 uppercase tracking-wide">High MQA</p>
          </div>
        </div>

        <Link
          href="/discover?status=DISCARDED"
          className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{discardedCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Discarded</p>
          </div>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_TABS.map((tab) => {
          const params = new URLSearchParams(sharedParams);
          if (tab.key === "NEW") {
            params.delete("status");
          } else {
            params.set("status", tab.key);
          }
          const qs = params.toString();
          return (
            <Link
              key={tab.key}
              href={`/discover${qs ? `?${qs}` : ""}`}
              className={`rounded-full px-4 py-2 font-medium transition ${
                statusParam === tab.key
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {tab.label}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${statusParam === tab.key ? "bg-slate-900/30" : "bg-white/10"}`}>
                {tab.key === "NEW" ? newCount : tab.key === "CONVERTED" ? convertedCount : tab.key === "DISCARDED" ? discardedCount : totalOpps}
              </span>
            </Link>
          );
        })}
      </div>

      <Card className="space-y-4 rounded-xl border border-white/10 bg-[#0F1012] px-5 py-4 shadow-lg shadow-black/20">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-5" method="get">
          <input type="hidden" name="status" value={statusParam} />
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs uppercase text-slate-500">Source</label>
            <select
              name="source"
              defaultValue={sourceParam || ""}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            >
              <option value="">All sources</option>
              {sourceTypes.map((s: { sourceType: string }) => (
                <option key={s.sourceType} value={s.sourceType} className="bg-slate-900">
                  {s.sourceType}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase text-slate-500">Min MQA</label>
            <input
              type="number"
              name="minMqa"
              defaultValue={minMqa ?? ""}
              placeholder="0"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase text-slate-500">Min ICP</label>
            <input
              type="number"
              name="minIcp"
              defaultValue={minIcp ?? ""}
              placeholder="0"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase text-slate-500">Min Lead</label>
            <input
              type="number"
              name="minLead"
              defaultValue={minLead ?? ""}
              placeholder="0"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs uppercase text-slate-500">Tag contains</label>
            <input
              type="text"
              name="tag"
              defaultValue={tagParam || ""}
              placeholder="e.g. gaming"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase text-slate-500">Sort</label>
            <select
              name="sort"
              defaultValue={sortParam || "mqa"}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3 md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Apply filters
            </button>
            <Link
              href={`/discover${statusParam === "NEW" ? "" : `?status=${statusParam}`}`}
              className="text-sm text-emerald-200 underline underline-offset-4"
            >
              Clear filters
            </Link>
          </div>
        </form>
        <p className="text-xs text-slate-400">
          Showing {opportunities.length} opportunity{opportunities.length === 1 ? "" : "ies"}
          {sourceParam ? ` • Source: ${sourceParam}` : ""}
          {minMqa ? ` • MQA ≥ ${minMqa}` : ""}
          {minIcp ? ` • ICP ≥ ${minIcp}` : ""}
          {minLead ? ` • Lead ≥ ${minLead}` : ""}
          {tagParam ? ` • Tag contains "${tagParam}"` : ""}
          {sortParam ? ` • Sorted by ${SORT_OPTIONS.find((s) => s.key === sortParam)?.label ?? "MQA priority"}` : ""}
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {opportunities.map((opp: (typeof opportunities)[number]) => {
          const tags = parseJsonString<string[]>(opp.tags, []);
          const bdAngles = parseJsonString<string[]>(opp.bdAngles, []);
          return (
            <Card key={opp.id} className="space-y-3 rounded-xl border border-white/10 bg-[#0F1012] px-5 py-4 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <a href={opp.url} target="_blank" className="text-lg font-semibold text-white hover:text-emerald-300">
                    {opp.title || opp.url}
                  </a>
                  <p className="text-xs text-slate-400">
                    Source: {opp.sourceType} {opp.sourceLabel ? `• ${opp.sourceLabel}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 text-[11px] text-slate-300">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                    <p className="text-[11px] uppercase text-slate-500">MQA</p>
                    <p className="text-base font-bold text-white">{opp.mqaScore ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center">
                    <p className="text-[11px] uppercase text-slate-500">ICP</p>
                    <p className="text-base font-bold text-white">{opp.icpScore ?? "-"}</p>
                  </div>
                </div>
              </div>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <TagPill key={t} className="bg-white/80 text-slate-800">
                      {t}
                    </TagPill>
                  ))}
                </div>
              ) : null}
              {bdAngles.length > 0 ? (
                <div className="text-xs text-slate-300">
                  <p className="text-[11px] uppercase text-slate-500">BD Angles</p>
                  <p>• {bdAngles.slice(0, 2).join(" • ")}</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">Lead {opp.leadScore ?? "-"}</Badge>
                  <Badge variant="neutral">Status {opp.status}</Badge>
                </div>
                <OpportunityActions opportunityId={opp.id} projectId={opp.projectId} />
              </div>
            </Card>
          );
        })}
        {opportunities.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0F1012] px-6 py-10 text-center text-slate-300">
            <div className="text-3xl">🛰️</div>
            <p className="mt-2 text-lg font-semibold text-white">No opportunities found</p>
            <p className="text-sm text-slate-400">Try scanning some text or pages.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
