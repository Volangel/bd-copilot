"use client";

import { cn } from "./utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[var(--bg-elevated)]/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/5 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-white/20 hover:ring-white/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  helper,
  className,
}: {
  title: string;
  value: string | number;
  helper?: string;
  className?: string;
}) {
  return (
    <Card className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
      <p className="text-[32px] font-semibold leading-[1.2] tracking-tight text-[var(--text-primary)]">{value}</p>
      {helper ? <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">{helper}</p> : null}
    </Card>
  );
}
