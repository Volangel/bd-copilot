"use client";

import type { AppMode } from "./sidebar-nav";
import { cn } from "./utils";

export function ModeBadge({ mode }: { mode: AppMode }) {
  const colors: Record<AppMode, string> = {
    discover: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30",
    pipeline: "bg-blue-500/20 text-blue-200 border border-blue-500/30",
    execute: "bg-purple-500/20 text-purple-200 border border-purple-500/30",
    other: "bg-slate-800 text-slate-200 border border-slate-700",
  };
  const label: Record<AppMode, string> = {
    discover: "Discover",
    pipeline: "Pipeline",
    execute: "Execute",
    other: "Today",
  };
  return (
    <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide", colors[mode])}>
      {label[mode]}
    </span>
  );
}
