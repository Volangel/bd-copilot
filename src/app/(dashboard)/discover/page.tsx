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

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = searchParams || {};
  const statusParam = typeof params?.status === "string" ? params.status : "NEW";
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const where = {
    userId: session.user.id,
    ...(statusParam && statusParam !== "ALL" ? { status: statusParam } : {}),
  } as const;

  const opportunities = await prisma.opportunity.findMany({
    where,
    orderBy: [
      { mqaScore: "desc" },
      { icpScore: "desc" },
      { createdAt: "desc" },
    ],
  });

  return (
    <div className="flex flex-col gap-8 px-8 py-10 md:py-12 lg:px-10 xl:max-w-6xl xl:mx-auto">
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
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/discover${tab.key === "NEW" ? "" : `?status=${tab.key}`}`}
            className={`rounded-full px-3 py-1 transition ${
              statusParam === tab.key || (tab.key === "NEW" && !statusParam)
                ? "bg-emerald-500 text-slate-950"
                : "border border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

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
    </div>
  );
}
