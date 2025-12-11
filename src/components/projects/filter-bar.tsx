"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PROJECT_STATUSES } from "@/lib/utils";

type FilterBarProps = {
  totalCount: number;
  currentQuery: string;
  currentStatuses: string[];
  currentMinICP?: number;
  currentMinMQA?: number;
};

type QuickFilter = {
  id: string;
  label: string;
  icon: React.ReactNode;
  getParams: () => URLSearchParams;
};

export function FilterBar({ totalCount, currentQuery, currentStatuses, currentMinICP, currentMinMQA }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState(currentQuery);

  const quickFilters: QuickFilter[] = [
    {
      id: "all",
      label: "All",
      icon: <span className="text-sm">📋</span>,
      getParams: () => new URLSearchParams(),
    },
    {
      id: "active",
      label: "Active",
      icon: <span className="text-sm">🔥</span>,
      getParams: () => {
        const p = new URLSearchParams();
        p.set("status", "NOT_CONTACTED,CONTACTED,WAITING_REPLY,CALL_BOOKED");
        return p;
      },
    },
    {
      id: "high-icp",
      label: "High ICP (70+)",
      icon: <span className="text-sm">⭐</span>,
      getParams: () => {
        const p = new URLSearchParams();
        p.set("minICP", "70");
        return p;
      },
    },
    {
      id: "needs-action",
      label: "Needs Action",
      icon: <span className="text-sm">⚡</span>,
      getParams: () => {
        const p = new URLSearchParams();
        p.set("status", "NOT_CONTACTED,WAITING_REPLY");
        return p;
      },
    },
  ];

  const activeFilterId = (() => {
    const statusStr = currentStatuses.join(",");
    if (!currentQuery && !statusStr && !currentMinICP && !currentMinMQA) return "all";
    if (statusStr === "NOT_CONTACTED,CONTACTED,WAITING_REPLY,CALL_BOOKED" && !currentMinICP) return "active";
    if (currentMinICP === 70 && !statusStr) return "high-icp";
    if (statusStr === "NOT_CONTACTED,WAITING_REPLY" && !currentMinICP) return "needs-action";
    return null;
  })();

  const applyQuickFilter = (filter: QuickFilter) => {
    const params = filter.getParams();
    router.push(`/projects?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("q", search);
    } else {
      params.delete("q");
    }
    router.push(`/projects?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    router.push("/projects");
  };

  const hasActiveFilters = currentQuery || currentStatuses.length > 0 || currentMinICP || currentMinMQA;

  return (
    <div className="space-y-3">
      {/* Main filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[240px] max-w-md">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="w-full rounded-lg border border-white/10 bg-[#0B0C0E] py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                const params = new URLSearchParams(searchParams.toString());
                params.delete("q");
                router.push(`/projects?${params.toString()}`);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* Quick filters */}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0B0C0E] p-1">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => applyQuickFilter(filter)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeFilterId === filter.id
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
            showAdvanced || hasActiveFilters
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black">
              {(currentStatuses.length > 0 ? 1 : 0) + (currentMinICP ? 1 : 0) + (currentMinMQA ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all
          </button>
        )}

        {/* Export */}
        <a
          className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
          href={`/api/projects/export?q=${encodeURIComponent(currentQuery)}&status=${currentStatuses.join(",")}&minICP=${currentMinICP ?? ""}&minMQA=${currentMinMQA ?? ""}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </a>
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <form
          action="/projects"
          className="grid gap-4 rounded-xl border border-white/10 bg-[#0B0C0E] p-4 md:grid-cols-3"
        >
          {/* Status filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Status</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_STATUSES.map((status) => {
                const isChecked = currentStatuses.includes(status);
                const colorMap: Record<string, string> = {
                  NOT_CONTACTED: "border-slate-500 bg-slate-500/10",
                  CONTACTED: "border-blue-500 bg-blue-500/10",
                  WAITING_REPLY: "border-amber-500 bg-amber-500/10",
                  CALL_BOOKED: "border-purple-500 bg-purple-500/10",
                  WON: "border-emerald-500 bg-emerald-500/10",
                  LOST: "border-red-500 bg-red-500/10",
                };
                return (
                  <label
                    key={status}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      isChecked ? colorMap[status] : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="status"
                      value={status}
                      defaultChecked={isChecked}
                      className="sr-only"
                    />
                    <StatusDot status={status} />
                    {status.replace(/_/g, " ")}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Score filters */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Minimum Scores</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">ICP ≥</span>
                  <input
                    type="number"
                    name="minICP"
                    defaultValue={currentMinICP ?? ""}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="w-full rounded-lg border border-white/10 bg-[#141618] py-2 pl-12 pr-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">MQA ≥</span>
                  <input
                    type="number"
                    name="minMQA"
                    defaultValue={currentMinMQA ?? ""}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="w-full rounded-lg border border-white/10 bg-[#141618] py-2 pl-14 pr-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Apply button */}
          <div className="flex items-end justify-end gap-2">
            <input type="hidden" name="q" value={currentQuery} />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black shadow-md shadow-emerald-500/20 transition hover:bg-emerald-400"
            >
              Apply Filters
            </button>
          </div>
        </form>
      )}

      {/* Active filter tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Active:</span>
          {currentQuery && (
            <FilterTag
              label={`Search: "${currentQuery}"`}
              onRemove={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("q");
                setSearch("");
                router.push(`/projects?${params.toString()}`);
              }}
            />
          )}
          {currentStatuses.map((status) => (
            <FilterTag
              key={status}
              label={status.replace(/_/g, " ")}
              color={statusColorMap[status]}
              onRemove={() => {
                const params = new URLSearchParams(searchParams.toString());
                const newStatuses = currentStatuses.filter((s) => s !== status);
                if (newStatuses.length) {
                  params.set("status", newStatuses.join(","));
                } else {
                  params.delete("status");
                }
                router.push(`/projects?${params.toString()}`);
              }}
            />
          ))}
          {currentMinICP && (
            <FilterTag
              label={`ICP ≥ ${currentMinICP}`}
              onRemove={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("minICP");
                router.push(`/projects?${params.toString()}`);
              }}
            />
          )}
          {currentMinMQA && (
            <FilterTag
              label={`MQA ≥ ${currentMinMQA}`}
              onRemove={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("minMQA");
                router.push(`/projects?${params.toString()}`);
              }}
            />
          )}
          <span className="ml-2 text-xs text-slate-500">{totalCount} results</span>
        </div>
      )}
    </div>
  );
}

const statusColorMap: Record<string, string> = {
  NOT_CONTACTED: "slate",
  CONTACTED: "blue",
  WAITING_REPLY: "amber",
  CALL_BOOKED: "purple",
  WON: "emerald",
  LOST: "red",
};

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    NOT_CONTACTED: "bg-slate-400",
    CONTACTED: "bg-blue-400",
    WAITING_REPLY: "bg-amber-400",
    CALL_BOOKED: "bg-purple-400",
    WON: "bg-emerald-400",
    LOST: "bg-red-400",
  };
  return <span className={`h-2 w-2 rounded-full ${colorMap[status] || "bg-slate-400"}`} />;
}

function FilterTag({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  const bgColors: Record<string, string> = {
    slate: "bg-slate-500/20 text-slate-300",
    blue: "bg-blue-500/20 text-blue-300",
    amber: "bg-amber-500/20 text-amber-300",
    purple: "bg-purple-500/20 text-purple-300",
    emerald: "bg-emerald-500/20 text-emerald-300",
    red: "bg-red-500/20 text-red-300",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${color ? bgColors[color] : "bg-white/10 text-slate-300"}`}>
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:text-white">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
