"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type FocusItem = {
  id: string;
  name: string | null;
  url: string;
  status: string;
  nextSequenceStepDueAt: Date | null;
  sequenceCount: number;
};

type FocusPanelProps = {
  overdue: FocusItem[];
  dueToday: FocusItem[];
};

export function FocusPanel({ overdue, dueToday }: FocusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const totalItems = overdue.length + dueToday.length;
  const hasItems = totalItems > 0;

  // Don't render at all if nothing to show
  if (!hasItems) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-300">All caught up!</p>
          <p className="text-xs text-slate-400">No overdue tasks or items due today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-[#0F1012] to-[#12141a] shadow-lg">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-red-500/20">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Focus Today</h3>
            <p className="text-xs text-slate-400">
              {overdue.length > 0 && <span className="text-red-400">{overdue.length} overdue</span>}
              {overdue.length > 0 && dueToday.length > 0 && <span> · </span>}
              {dueToday.length > 0 && <span className="text-amber-400">{dueToday.length} due today</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {overdue.length > 0 && (
              <Badge variant="danger" className="text-[10px]">
                {overdue.length} Overdue
              </Badge>
            )}
            {dueToday.length > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {dueToday.length} Today
              </Badge>
            )}
          </div>
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="border-t border-white/5 px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            {/* Overdue Section */}
            {overdue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                  Overdue
                </div>
                <div className="space-y-2">
                  {overdue.slice(0, 5).map((item) => (
                    <FocusCard key={item.id} item={item} variant="overdue" />
                  ))}
                  {overdue.length > 5 && (
                    <p className="text-xs text-slate-500">+{overdue.length - 5} more overdue</p>
                  )}
                </div>
              </div>
            )}

            {/* Due Today Section */}
            {dueToday.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                  Due Today
                </div>
                <div className="space-y-2">
                  {dueToday.slice(0, 5).map((item) => (
                    <FocusCard key={item.id} item={item} variant="today" />
                  ))}
                  {dueToday.length > 5 && (
                    <p className="text-xs text-slate-500">+{dueToday.length - 5} more due today</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FocusCard({ item, variant }: { item: FocusItem; variant: "overdue" | "today" }) {
  const borderColor = variant === "overdue" ? "border-l-red-500" : "border-l-amber-500";
  const displayName = item.name || new URL(item.url).hostname;

  return (
    <Link
      href={`/projects/${item.id}/workspace`}
      className={`group flex items-center justify-between rounded-lg border border-white/5 border-l-2 ${borderColor} bg-white/5 px-3 py-2.5 transition hover:bg-white/10`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white group-hover:text-emerald-300">
          {displayName}
        </p>
        <p className="truncate text-[11px] text-slate-500">{item.url}</p>
      </div>
      <div className="ml-3 flex items-center gap-2">
        <StatusDot status={item.status} />
        <svg className="h-4 w-4 text-slate-500 opacity-0 transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    NOT_CONTACTED: "bg-slate-400",
    CONTACTED: "bg-blue-400",
    WAITING_REPLY: "bg-amber-400",
    CALL_BOOKED: "bg-purple-400",
    WON: "bg-emerald-400",
    LOST: "bg-red-400",
  };
  return (
    <span className={`h-2 w-2 rounded-full ${colorMap[status] || "bg-slate-400"}`} title={status.replace(/_/g, " ")} />
  );
}
