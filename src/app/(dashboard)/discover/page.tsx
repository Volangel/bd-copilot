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

  const [opportunities, sourceTypes] = await Promise.all([
    prisma.opportunity.findMany({ where, orderBy }),
    prisma.opportunity.findMany({
      where: { userId: session.user.id },
      select: { sourceType: true },
      distinct: ["sourceType"],
      orderBy: { sourceType: "asc" },
    }),
  ]);

  const sharedParams = new URLSearchParams();
  if (sourceParam) sharedParams.set("source", sourceParam);
  if (tagParam) sharedParams.set("tag", tagParam);
  if (minMqa !== null) sharedParams.set("minMqa", String(minMqa));
  if (minIcp !== null) sharedParams.set("minIcp", String(minIcp));
  if (minLead !== null) sharedParams.set("minLead", String(minLead));
  if (sortParam && sortParam !== "mqa") sharedParams.set("sort", sortParam);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Discovery Feed" description="Ranked opportunities from scans. Convert or discard." mode="discover" />
        <Link
          href="/discover/scan"
          className="rounded-lg border border-white/10 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/30"
        >
          Scan new opportunities
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
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
              className={`rounded-full px-3 py-1 transition ${
                statusParam === tab.key
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {tab.label}
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
              {sourceTypes.map((s) => (
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
        {opportunities.map((opp) => {
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
    </>
  );
}
