"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Toast } from "@/components/ui/toast";

export type TimelineItem = {
  id: string;
  title: string;
  due?: Date | null;
  type: "overdue" | "upcoming" | "new";
  href?: string;
};

type FocusTarget = {
  summary: string;
  label: string;
  cta: { label: string; href: string };
  channel?: string | null;
  scheduledAt?: Date | null;
};

type MomentumStat = { label: string; value: number; helper: string };

export function FocusMomentumPanel({
  focus,
  stats,
  momentum,
  timeline,
  secondaryCta,
}: {
  focus: FocusTarget | null;
  stats: { overdue: number; dueToday: number; newOpps: number };
  momentum: { score: number; label: string; copy: string };
  timeline: TimelineItem[];
  secondaryCta: { href: string; label: string };
}) {
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  const momentumBreakdown: MomentumStat[] = useMemo(
    () => [
      { label: "Overdue pressure", value: stats.overdue * 12, helper: "Clears unlock the score" },
      { label: "Today load", value: stats.dueToday * 6, helper: "Schedule or batch" },
      { label: "Fresh leads", value: Math.min(stats.newOpps, 6) * 3, helper: "New signal adds energy" },
    ],
    [stats.dueToday, stats.newOpps, stats.overdue],
  );

  const triggerToast = (message: string) => {
    setToast({ message, type: "success" });
    setTimeout(() => setToast(null), 2800);
  };

  const handleComplete = () => {
    setCelebrating(true);
    triggerToast("Marked done — momentum boosted");
    setTimeout(() => setCelebrating(false), 1200);
  };

  const handleSnooze = () => {
    setSnoozed(true);
    triggerToast("Snoozed for later today");
  };

  const badgeTone = focus?.label.includes("Overdue")
    ? "bg-red-500/15 text-red-100"
    : focus?.label.includes("Scheduled")
      ? "bg-amber-400/15 text-amber-100"
      : focus?.label.includes("New")
        ? "bg-blue-500/15 text-blue-100"
        : "bg-white/10 text-white";

  return (
    <>
      <Card className="flex flex-col gap-4 overflow-hidden border-white/10 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Focus for today</p>
            {focus ? (
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${badgeTone}`}>{focus.label}</span>
            ) : null}
          </div>
          <p className="text-lg font-semibold text-white">{focus ? focus.summary : "You’re caught up"}</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-tertiary)]">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Overdue: {stats.overdue}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Due today: {stats.dueToday}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">New opps: {stats.newOpps}</span>
          </div>
          {focus?.scheduledAt ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Scheduled</span>
              <span>{formatDate(focus.scheduledAt)}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1 text-sm text-[var(--text-secondary)]">
            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1.5 text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
            >
              ✅ Done
            </button>
            <button
              type="button"
              onClick={handleSnooze}
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-amber-50 transition hover:border-amber-300 hover:bg-amber-500/20"
            >
              💤 Snooze
            </button>
            {focus ? (
              <Link
                href={focus.cta.href}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white transition hover:border-white/25 hover:bg-white/10"
              >
                🔍 Open details
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-tertiary)]">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Session-first clears overdue quickly</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Radar surfaces brand-new leads</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 text-sm md:items-end">
          <Link
            href={focus ? focus.cta.href : secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
          >
            {focus ? focus.cta.label : secondaryCta.label}
          </Link>
          <Link
            href="/session"
            className="text-xs text-emerald-300 underline-offset-2 hover:text-emerald-200 hover:underline"
          >
            Start with AI draft
          </Link>
          {celebrating ? <div className="h-10 w-10 animate-ping rounded-full bg-emerald-400/40" aria-hidden /> : null}
          {snoozed ? <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[11px] text-amber-100">Snoozed in queue</span> : null}
        </div>
      </Card>

      <Card className="space-y-6 border-white/10 bg-[var(--bg-secondary)]/80 p-6">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Momentum pulse</p>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  momentum.score >= 80
                    ? "bg-emerald-500/15 text-emerald-100"
                    : momentum.score >= 50
                      ? "bg-amber-400/15 text-amber-100"
                      : "bg-red-500/15 text-red-100"
                }`}
              >
                {momentum.label}
              </span>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/30">
              <div className="flex items-center gap-4">
                <div className="flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-300 shadow-[0_10px_40px_rgba(16,185,129,0.4)]"
                    style={{ width: `${momentum.score}%` }}
                  />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold leading-tight text-white">{momentum.score}%</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Momentum for today</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {momentumBreakdown.map((stat) => (
                  <div
                    key={stat.label}
                    className="group rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-[var(--text-tertiary)] shadow-inner shadow-black/20 transition hover:border-emerald-300/60 hover:bg-emerald-500/10"
                  >
                    <p className="font-semibold text-[var(--text-primary)]">{stat.label}</p>
                    <p>Impact: -{stat.value}</p>
                    <p className="opacity-70">{stat.helper}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{momentum.copy}</p>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Recommended next move</p>
                <p className="text-xs text-[var(--text-tertiary)]">Built from your most urgent signals</p>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-white/5 bg-[var(--bg-tertiary)]/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-primary)]">Top focus</p>
              <p className="text-sm font-semibold text-white">{focus ? focus.summary : "You’re caught up—set the tone with a quick scan."}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{focus ? focus.label : "Balanced"}</p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-[var(--text-tertiary)]">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Tap Done to log progress</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Snooze to reprioritize</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={focus ? focus.cta.href : secondaryCta.href}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/25"
              >
                {focus ? focus.cta.label : secondaryCta.label}
              </Link>
              <Link
                href="/radar"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                Open Radar
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-2">
              <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                <span className="mt-0.5 text-lg">⏱️</span>
                <div>
                  <p className="font-semibold text-white">Start with a 20-minute sprint</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Batch overdue + due today tasks in Session mode.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                <span className="mt-0.5 text-lg">🔍</span>
                <div>
                  <p className="font-semibold text-white">Check for fresh signal</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Run Radar to see what’s new before outreach.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Timeline</p>
            <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-[var(--text-secondary)]">Swipe to explore</span>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {timeline.map((item) => (
              <div
                key={item.id}
                className={`min-w-[210px] rounded-2xl border px-4 py-3 shadow-sm transition hover:-translate-y-[1px] ${
                  item.type === "overdue"
                    ? "border-red-400/40 bg-red-500/10"
                    : item.type === "upcoming"
                      ? "border-amber-400/40 bg-amber-500/10"
                      : "border-emerald-400/40 bg-emerald-500/10"
                }`}
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {item.due ? <p className="text-[11px] text-[var(--text-tertiary)]">Due {formatDate(item.due)}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
                  <button
                    type="button"
                    onClick={() => triggerToast("Scheduled +30m")}
                    className="rounded-full bg-white/10 px-2 py-1 transition hover:bg-white/20"
                  >
                    +30m
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerToast("Scheduled tomorrow")}
                    className="rounded-full bg-white/10 px-2 py-1 transition hover:bg-white/20"
                  >
                    Tomorrow
                  </button>
                  {item.href ? (
                    <Link href={item.href} className="rounded-full bg-black/20 px-2 py-1 text-emerald-200 transition hover:bg-black/30">
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </>
  );
}
