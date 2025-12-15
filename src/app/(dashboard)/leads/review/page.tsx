import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { convertOpportunityToProject } from "@/lib/discovery/convertOpportunityToProject";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { TagPill, Badge } from "@/components/ui/badge";
import { PrimaryButton, SecondaryButton, GhostButton } from "@/components/ui/buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { parseJsonString } from "@/lib/parsers";

export default async function LeadReviewPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const resolvedSearch = searchParams || {};
  const requestedId = resolvedSearch.id;
  const now = new Date();
  const ordered = await prisma.opportunity.findMany({
    where: {
      userId: session.user.id,
      OR: [{ status: "NEW" }, { status: "SNOOZED", nextReviewAt: { lte: now } }],
    },
    select: { id: true },
    orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
  });
  const total = ordered.length;
  const opp =
    (requestedId
      ? await prisma.opportunity.findFirst({
          where: {
            userId: session.user.id,
            id: requestedId,
            OR: [{ status: "NEW" }, { status: "SNOOZED", nextReviewAt: { lte: now } }],
          },
        })
      : null) ||
    (await prisma.opportunity.findFirst({
      where: { userId: session.user.id, OR: [{ status: "NEW" }, { status: "SNOOZED", nextReviewAt: { lte: now } }] },
      orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
    }));

  if (!opp) {
    return (
      <>
        <PageHeader title="Lead Review" description="Work new leads one by one." />
        <EmptyState
          title="Nothing in your review queue"
          description="Use Radar or Discover to find opportunities to review."
          icon="✅"
          primaryAction={{ label: "Go to Radar", href: "/radar" }}
          secondaryAction={{ label: "Scan text", href: "/discover/scan" }}
        />
      </>
    );
  }

  const errorMsg = resolvedSearch.error;
  const index = ordered.findIndex((o: { id: string }) => o.id === opp.id);
  const positionLabel = total > 0 && index >= 0 ? `Lead ${index + 1} of ${total}` : null;
  const tags = parseJsonString<string[]>(opp.tags, []);
  const playbooks = parseJsonString<string[]>(opp.playbookMatches, []);

  async function convert() {
    "use server";
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner) redirect("/login");
    try {
      const project = await convertOpportunityToProject({ opportunityId: opp.id, userId: sessionInner.user.id });
      if (project) {
        await prisma.opportunity.update({ where: { id: opp.id }, data: { status: "CONVERTED", projectId: project.id } });
        redirect(`/projects/${project.id}/workspace`);
      } else {
        redirect("/leads/review?error=convert_failed");
      }
    } catch (err) {
      console.error("Lead review convert failed", { userId: sessionInner.user.id, oppId: opp.id, err });
      redirect("/leads/review?error=convert_failed");
    }
  }

  async function discard() {
    "use server";
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner) redirect("/login");
    try {
      await prisma.opportunity.update({ where: { id: opp.id, userId: sessionInner.user.id }, data: { status: "DISCARDED" } });
      redirect("/leads/review");
    } catch (err) {
      console.error("Lead review discard failed", { userId: sessionInner.user.id, oppId: opp.id, err });
      redirect("/leads/review?error=discard_failed");
    }
  }

  async function snooze() {
    "use server";
    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner) redirect("/login");
    try {
      const now = new Date();
      const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await prisma.opportunity.update({ where: { id: opp.id, userId: sessionInner.user.id }, data: { status: "SNOOZED", nextReviewAt: next } });
      redirect("/leads/review");
    } catch (err) {
      console.error("Lead review snooze failed", { userId: sessionInner.user.id, oppId: opp.id, err });
      redirect("/leads/review?error=snooze_failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Review"
        description="Work new leads one by one."
        mode="discover"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {positionLabel ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200">{positionLabel}</span>
            ) : null}
            <Link
              href="/radar"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Radar
            </Link>
          </div>
        }
      />

      {/* Focus card for current lead */}
      <Card className="flex flex-col gap-4 overflow-hidden border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Current lead</p>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-[11px] font-semibold text-blue-100">New lead</span>
          </div>
          <p className="text-lg font-semibold text-white">{opp.title || opp.url}</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-200">Lead {opp.leadScore ?? "–"}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">ICP {opp.icpScore ?? "–"}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">MQA {opp.mqaScore ?? "–"}</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <a
            href={opp.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open URL
          </a>
        </div>
      </Card>

      {errorMsg ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Action failed: {errorMsg}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lead details */}
        <Card className="space-y-5 rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <SectionHeader title="Lead Details" />
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase text-slate-400">URL</p>
            <a href={opp.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-300 hover:underline">{opp.url}</a>
            <p className="text-xs text-slate-400">{opp.sourceType}{opp.sourceLabel ? ` · ${opp.sourceLabel}` : ""}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Summary</p>
            <p className="text-sm text-slate-200">{opp.title || opp.summary || "No summary available"}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Tags</p>
            <div className="flex flex-wrap gap-1">
              {tags.length ? tags.map((t) => <TagPill key={t}>{t}</TagPill>) : <p className="text-xs text-slate-500">No tags</p>}
            </div>
          </div>
          {playbooks.length ? (
            <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-slate-400">Playbook matches</p>
              <div className="flex flex-wrap gap-1">
                {playbooks.map((p) => (
                  <Badge key={p} variant="info">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        {/* Actions panel */}
        <Card className="space-y-5 rounded-xl border border-white/10 bg-gradient-to-br from-[#0F1116] to-[#0B0C10] px-6 py-5 shadow-lg shadow-black/20">
          <SectionHeader title="Actions" />
          <div className="space-y-4">
            <form action={convert} className="w-full">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-500/15 px-4 py-4 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/25"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Convert to Project (C)
              </button>
            </form>
            <div className="grid grid-cols-2 gap-3">
              <form action={snooze}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-500/20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Snooze 7d (X)
                </button>
              </form>
              <form action={discard}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Not relevant (Z)
                </button>
              </form>
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-white/5 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quick navigation</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/radar"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Lead Radar
              </Link>
              <Link
                href="/discover/scan"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan more leads
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Discovery Feed
              </Link>
            </div>
          </div>
          <p className="text-xs text-slate-500">Keyboard shortcuts: C = Convert, X = Snooze, Z = Not relevant</p>
        </Card>
      </div>
    </div>
  );
}
