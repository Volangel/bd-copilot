"use client";

import { cn } from "./utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-[#1A1F3A] p-6 shadow-lg shadow-black/20 transition-all duration-200 ease-out hover:shadow-xl hover:border-white/15",
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
      <p className="text-sm font-medium text-slate-200">{title}</p>
      <p className="text-3xl font-semibold text-white tracking-tight leading-tight">{value}</p>
      {helper ? <p className="text-xs text-slate-500 leading-relaxed">{helper}</p> : null}
    </Card>
  );
}
