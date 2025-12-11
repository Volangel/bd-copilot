"use client";

import { useState, useEffect } from "react";
import { cn } from "./utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  storageKey?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  priority?: "high" | "medium" | "low";
}

export function CollapsibleSection({
  title,
  subtitle,
  badge,
  actions,
  defaultOpen = true,
  storageKey,
  children,
  className,
  headerClassName,
  isEmpty = false,
  emptyMessage,
  priority = "medium",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Persist collapse state in localStorage
  useEffect(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`collapse-${storageKey}`);
      if (stored !== null) {
        setIsOpen(stored === "true");
      }
    }
  }, [storageKey]);

  const toggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (storageKey) {
      localStorage.setItem(`collapse-${storageKey}`, String(newState));
    }
  };

  const priorityIndicator = {
    high: "border-l-emerald-500",
    medium: "border-l-slate-600",
    low: "border-l-slate-800",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[var(--bg-elevated)]/95 shadow-[0_20px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/5 transition-all duration-200 ease-out",
        "border-l-2",
        priorityIndicator[priority],
        className,
      )}
    >
      <button
        onClick={toggle}
        className={cn(
          "flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/5",
          isOpen ? "border-b border-white/5" : "",
          headerClassName,
        )}
      >
        <div className="flex items-center gap-3">
          <svg
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              isOpen ? "rotate-90" : "",
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{title}</span>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="p-4">
          {isEmpty ? (
            <div className="flex items-center justify-center py-6 text-center">
              <p className="text-sm text-slate-500">{emptyMessage || "No data yet"}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
