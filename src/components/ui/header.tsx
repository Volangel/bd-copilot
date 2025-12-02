import { cn } from "./utils";
import type { AppMode } from "./sidebar-nav";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  mode,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  mode?: AppMode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2">
          {mode ? <ModeBadge mode={mode} /> : null}
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">{title}</h1>
        </div>
        {description ? <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({ title, helper, className }: { title: string; helper?: string; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <p className="text-2xl font-semibold leading-tight tracking-tight text-[var(--text-primary)]">{title}</p>
      {helper ? <span className="text-sm leading-relaxed text-[var(--text-tertiary)]">{helper}</span> : null}
    </div>
  );
}

function ModeBadge({ mode }: { mode: AppMode }) {
  const colors: Record<AppMode, string> = {
    discover: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    pipeline: "border-blue-400/30 bg-blue-500/10 text-blue-100",
    execute: "border-purple-400/30 bg-purple-500/10 text-purple-100",
    other: "border-white/15 bg-white/5 text-slate-100",
  };
  const label: Record<AppMode, string> = {
    discover: "Discover",
    pipeline: "Pipeline",
    execute: "Execute",
    other: "Today",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-[0_6px_24px_rgba(0,0,0,0.3)]",
        colors[mode],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label[mode]}
    </span>
  );
}
