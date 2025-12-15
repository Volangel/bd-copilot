import TemplateManager from "@/components/templates/template-manager";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const templates = await prisma.template.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  type TemplateType = (typeof templates)[number];

  // Group templates by type for stats
  const categories = new Set(templates.map((t: TemplateType) => t.category || "general"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Save reusable snippets for outreach."
        mode="other"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/session"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Use in Session
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              View Projects
            </Link>
          </div>
        }
      />

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-500/10">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{templates.length}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total templates</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-purple-500/[0.08] px-4 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/15">
            <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">{categories.size}</p>
            <p className="text-[10px] text-purple-400/70 uppercase tracking-wide">Categories</p>
          </div>
        </div>

        <Link
          href="/session"
          className="flex items-center gap-3 rounded-lg bg-emerald-500/[0.08] px-4 py-2.5 transition-colors hover:bg-emerald-500/[0.12]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-100">Use templates</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Start session</p>
          </div>
        </Link>
      </div>

      {/* Info card */}
      <Card className="flex flex-col gap-4 overflow-hidden border-purple-400/20 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Templates</p>
          <p className="text-sm text-slate-300">Create reusable message templates for different outreach scenarios. Use them in Session Mode to speed up your workflow.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Use in Session Mode
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Supports variables
          </span>
        </div>
      </Card>

      {/* Template manager card */}
      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 ring-1 ring-slate-500/30">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white">Your Templates</p>
            <p className="text-xs text-slate-500">{templates.length} template{templates.length !== 1 ? "s" : ""} saved</p>
          </div>
        </div>
        <TemplateManager initial={templates} />
      </Card>
    </div>
  );
}
