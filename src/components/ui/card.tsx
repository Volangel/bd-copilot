"use client";

import { cn } from "./utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 shadow-lg shadow-black/25 transition-all duration-200 ease-out hover:shadow-xl hover:border-[var(--border-strong)]",
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
