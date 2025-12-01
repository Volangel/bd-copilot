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
    discover: "border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
    pipeline: "border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
    execute: "border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
    other: "border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
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
