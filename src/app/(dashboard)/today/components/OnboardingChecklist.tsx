"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Step = { label: string; done: boolean; href: string; preview?: string };

export function OnboardingChecklist({ steps }: { steps: Step[] }) {
  const [activePreview, setActivePreview] = useState<Step | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progress = Math.round((completed / total) * 100);

  const estimatedTime = useMemo(() => Math.max(5, total * 3 - completed), [completed, total]);

  return (
    <div className="relative rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">Let’s get your BD cockpit ready</p>
          <p className="text-sm text-slate-400">Complete these steps and you’ll have a working pipeline in minutes.</p>
          <p className="mt-1 text-xs text-slate-500">
            {completed} of {total} done · ~{estimatedTime} min left
          </p>
        </div>
        <div className="relative grid place-items-center rounded-full bg-[var(--bg-tertiary)] p-3 shadow-inner shadow-black/30">
          <svg viewBox="0 0 36 36" className="h-14 w-14">
            <path
              className="text-white/10"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32"
            />
            <path
              className="text-emerald-400"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${progress}, 100`}
              d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32"
            />
          </svg>
          <span className="absolute text-xs font-semibold text-white">{progress}%</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-white/15"
          >
            <div className="flex items-center gap-3">
              <span
                className={`h-4 w-4 rounded-full border ${step.done ? "border-emerald-400 bg-emerald-400" : "border-slate-600"}`}
                aria-hidden
              />
              <div>
                <p className={step.done ? "text-slate-500 line-through" : ""}>{step.label}</p>
                {step.preview ? <p className="text-[11px] text-slate-400">Preview available</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {step.preview ? (
                <button
                  type="button"
                  onClick={() => setActivePreview(step)}
                  className="rounded-full border border-white/20 px-2 py-1 text-white transition hover:border-white/40 hover:bg-white/10"
                >
                  Preview
                </button>
              ) : null}
              <Link href={step.href} className="rounded-full border border-emerald-400/50 px-3 py-1 text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100">
                {step.done ? "Review" : "Open"}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="pointer-events-auto fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:border-white/20 hover:bg-white/15"
      >
        ❔ Need setup help?
      </button>

      {activePreview ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"
          onClick={() => setActivePreview(null)}
        >
          <div
            className="max-w-md rounded-2xl border border-white/10 bg-[var(--bg-secondary)] px-5 py-4 shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-white">{activePreview.label}</p>
            <p className="mt-1 text-sm text-slate-300">{activePreview.preview}</p>
            <div className="mt-3 flex gap-2 text-sm">
              <Link href={activePreview.href} className="rounded-lg border border-emerald-400/50 px-3 py-2 text-emerald-100 hover:border-emerald-300 hover:bg-emerald-500/10">
                Jump in
              </Link>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:border-white/20 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="max-w-lg space-y-3 rounded-2xl border border-white/10 bg-[var(--bg-secondary)] px-6 py-5 shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-white">Guided setup</p>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-white/20 hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-slate-300">Pick a step to preview or jump to the action you need next.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {steps.map((step) => (
                <button
                  key={step.label}
                  onClick={() => setActivePreview(step)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white transition hover:border-emerald-300/50 hover:bg-emerald-500/10"
                >
                  <span className="block text-[11px] uppercase tracking-[0.08em] text-[var(--accent-primary)]">{step.done ? "Ready" : "Next"}</span>
                  <span className="font-semibold">{step.label}</span>
                  <span className="block text-[11px] text-slate-400">{step.preview || "Review this step"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
