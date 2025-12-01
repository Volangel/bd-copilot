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
      <div className="flex flex-col gap-6 px-8 py-10 md:py-12 lg:px-10 xl:max-w-5xl xl:mx-auto">
        <PageHeader title="Lead Review" description="Work new leads one by one." />
        <EmptyState
          title="Nothing in your review queue"
          description="Use Radar or Discover to find opportunities to review."
          icon="✅"
          primaryAction={{ label: "Go to Radar", href: "/radar" }}
          secondaryAction={{ label: "Scan text", href: "/discover/scan" }}
        />
      </div>
    );
  }

  const errorMsg = resolvedSearch.error;
  const index = ordered.findIndex((o) => o.id === opp.id);
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
    <div className="flex flex-col gap-8 px-8 py-10 md:py-12 lg:px-10 xl:max-w-5xl xl:mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Lead Review" description="Work new leads one by one." />
        {positionLabel ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200">{positionLabel}</span>
        ) : null}
      </div>

      <Card className="space-y-6">
        {errorMsg ? <p className="text-xs text-red-300">Action failed: {errorMsg}</p> : null}
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader title="Lead" />
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-200">
                <Badge variant="info">Lead {opp.leadScore ?? "–"}</Badge>
                <Badge variant="neutral">ICP {opp.icpScore ?? "–"}</Badge>
                <Badge variant="neutral">MQA {opp.mqaScore ?? "–"}</Badge>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-slate-400">URL</p>
              <p className="text-sm font-semibold text-emerald-300">{opp.url}</p>
              <p className="text-xs text-slate-400">{opp.sourceType}{opp.sourceLabel ? ` · ${opp.sourceLabel}` : ""}</p>
            </div>
            <div className="space-y-2 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-slate-400">Summary</p>
              <p className="text-sm text-slate-200">{opp.title || opp.summary || ""}</p>
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
            <div className="text-xs text-slate-500">Shortcuts: C = Convert, X = Snooze, Z = Not relevant.</div>
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 px-4 py-4">
            <SectionHeader title="Actions" />
            <div className="flex flex-col gap-3">
              <form action={convert} className="w-full">
                <PrimaryButton className="w-full">Convert (C)</PrimaryButton>
              </form>
              <div className="flex flex-wrap gap-2">
                <form action={snooze} className="flex-1 min-w-[140px]">
                  <SecondaryButton className="w-full">Snooze 7d (X)</SecondaryButton>
                </form>
                <form action={discard} className="flex-1 min-w-[140px]">
                  <GhostButton className="w-full border-red-500 text-red-200 hover:bg-red-500/10">Not relevant (Z)</GhostButton>
                </form>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-white/5 bg-[#0F1012] px-4 py-3">
              <p className="text-xs uppercase text-slate-400">Next steps</p>
              <p className="text-sm text-slate-300">Open in Radar or continue reviewing.</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link href="/radar" className="text-emerald-300 hover:underline">
                  Back to Radar
                </Link>
                <span className="text-slate-600">·</span>
                <Link href="/discover/scan" className="text-emerald-300 hover:underline">
                  Scan more leads
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
