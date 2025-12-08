"use client";

import Link from "next/link";
import { useState } from "react";
import { Project } from "@prisma/client";
import { PROJECT_STATUSES, formatDate } from "@/lib/utils";
import { Toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

function StatusSelect({
  projectId,
  status,
  onChange,
}: {
  projectId: string;
  status: string;
  onChange: (status: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const updateStatus = async (value: string) => {
    setSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setSaving(false);
    onChange(value);
  };

  return (
    <select
      className="rounded-md border border-white/10 bg-[#0F1012] px-2 py-1 text-xs text-slate-100 shadow-sm transition-all duration-200 ease-out hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      value={status}
      disabled={saving}
      onChange={(e) => updateStatus(e.target.value)}
    >
      {PROJECT_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-[#0F1012] text-slate-200">
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

type BoardProject = Project & { nextSequenceStepDueAt?: Date | null; hasOverdueSequenceStep?: boolean };

export default function Board({ projects }: { projects: BoardProject[] }) {
  const [localProjects, setLocalProjects] = useState(projects);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    hotOnly: false,
    missingNext: false,
    overdueOnly: false,
  });
  const [sortMode, setSortMode] = useState<"next" | "icp">("next");
  const [searchTerm, setSearchTerm] = useState("");

  const deriveName = (name?: string | null, url?: string | null) => {
    if (name && name.trim().length > 0) return name;
    if (!url) return "Untitled";
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  const deriveDomain = (url?: string | null) => {
    if (!url) return "";
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  const urgencyLabel = (nextSequenceStepDueAt?: Date | null) => {
    if (!nextSequenceStepDueAt) return { label: "No next touch", color: "bg-slate-500" };
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    if (nextSequenceStepDueAt < startOfToday) return { label: "Overdue", color: "bg-red-500" };
    if (nextSequenceStepDueAt >= startOfToday && nextSequenceStepDueAt < endOfToday) return { label: "Today", color: "bg-amber-500" };
    const diffDays = Math.round((nextSequenceStepDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { label: diffDays <= 7 ? `In ${diffDays}d` : "Scheduled", color: "bg-teal-500" };
  };

  const icpBadgeVariant = (icp?: number | null) => {
    if (icp === null || icp === undefined) return "neutral";
    if (icp >= 75) return "success";
    if (icp >= 60) return "warning";
    return "neutral";
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredProjects = localProjects.filter((p) => {
    if (filters.hotOnly && (p.icpScore ?? 0) <= 80) return false;
    const nextDue = p.nextSequenceStepDueAt || null;
    if (filters.missingNext && nextDue) return false;
    if (filters.overdueOnly) {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      if (!nextDue || !(nextDue < startOfToday)) return false;
    }
    if (query.length > 0) {
      const name = deriveName(p.name, p.url).toLowerCase();
      const domain = deriveDomain(p.url).toLowerCase();
      if (!name.includes(query) && !domain.includes(query)) return false;
    }
    return true;
  });

  const activeFilterCount = Number(filters.hotOnly) + Number(filters.missingNext) + Number(filters.overdueOnly) + (query ? 1 : 0);

  const grouped = PROJECT_STATUSES.map((status) => {
    const items = filteredProjects
      .filter((p) => p.status === status)
      .sort((a, b) => {
        if (sortMode === "icp") {
          return (b.icpScore ?? 0) - (a.icpScore ?? 0);
        }
        const aDate = a.nextSequenceStepDueAt ? new Date(a.nextSequenceStepDueAt).getTime() : Number.POSITIVE_INFINITY;
        const bDate = b.nextSequenceStepDueAt ? new Date(b.nextSequenceStepDueAt).getTime() : Number.POSITIVE_INFINITY;
        return aDate - bDate;
      });
    return { status, items };
  });

  const handleStatusChange = (projectId: string, status: string) => {
    setLocalProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status } : p)));
    setMessage("Status updated");
    setError(null);
  };

  const onDragStart = (projectId: string) => {
    setDraggingId(projectId);
  };

  const onDrop = async (status: string) => {
    if (!draggingId) return;
    // optimistic update
    setLocalProjects((prev) => prev.map((p) => (p.id === draggingId ? { ...p, status } : p)));
    try {
      await fetch(`/api/projects/${draggingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setMessage("Card moved");
      setError(null);
    } catch (err) {
      console.error("Drag update failed", err);
      setError("Failed to update status");
    } finally {
      setDraggingId(null);
    }
  };

  const helperByStatus: Record<string, string> = {
    NOT_CONTACTED: "Cold leads",
    CONTACTED: "Initial touch",
    WAITING_REPLY: "Awaiting response",
    CALL_BOOKED: "Meeting arranged",
    WON: "Closed deals",
    LOST: "Inactive",
  };

  return (
    <div className="space-y-4">
      <Toast message={message} onClear={() => setMessage(null)} />
      <Toast message={error} type="error" onClear={() => setError(null)} />
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#232527] bg-[#0E0F10] p-3 text-xs text-slate-200">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">Quick filters</p>
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, hotOnly: !f.hotOnly }))}
          className={`rounded-full border px-3 py-1 transition ${
            filters.hotOnly ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-[#181A1C] hover:border-slate-500"
          }`}
        >
          ICP &gt; 80
        </button>
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, missingNext: !f.missingNext }))}
          className={`rounded-full border px-3 py-1 transition ${
            filters.missingNext ? "border-amber-400 bg-amber-500/10 text-amber-200" : "border-slate-700 bg-[#181A1C] hover:border-slate-500"
          }`}
        >
          Missing next touch
        </button>
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, overdueOnly: !f.overdueOnly }))}
          className={`rounded-full border px-3 py-1 transition ${
            filters.overdueOnly ? "border-red-400 bg-red-500/10 text-red-200" : "border-slate-700 bg-[#181A1C] hover:border-slate-500"
          }`}
        >
          Overdue only
        </button>
        <div className="ml-auto flex flex-1 min-w-[240px] items-center gap-2 rounded-md border border-[#232527] bg-[#181A1C] px-3 py-1.5 text-xs text-slate-200 shadow-inner shadow-black/40 md:max-w-sm">
          <span className="text-slate-400">🔎</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or domain"
            className="w-full bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">Sort</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as "next" | "icp")}
            className="rounded-md border border-[#232527] bg-[#181A1C] px-2 py-1 text-xs text-slate-100 shadow-sm"
          >
            <option value="next">Next touch</option>
            <option value="icp">ICP</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1C1F23] bg-gradient-to-r from-[#0E0F10] via-[#0F1114] to-[#0E1012] p-4 text-xs text-slate-200 shadow-sm">
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-wide text-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Premium view
        </div>
        <p className="text-sm text-slate-300">
          {activeFilterCount > 0 ? `${activeFilterCount} refinement${activeFilterCount > 1 ? "s" : ""} active` : "No filters active"}
          ; drag cards or use the status menu to move work forward.
        </p>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              setFilters({ hotOnly: false, missingNext: false, overdueOnly: false });
              setSearchTerm("");
              setSortMode("next");
            }}
            className="ml-auto rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200 transition hover:border-emerald-400 hover:bg-emerald-500/10"
          >
            Reset view
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {grouped.map((column) => (
          <div
            key={column.status}
            className={`min-h-[420px] rounded-xl border border-[#232527] bg-[#0E0F10] p-3 ${draggingId ? "ring-1 ring-emerald-500/30" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(column.status)}
          >
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
              <div>
                <span className="text-white">{column.status.replace(/_/g, " ")}</span>
                <p className="text-[11px] text-slate-500">{helperByStatus[column.status] || ""}</p>
              </div>
              <span className="rounded-full border border-[#232527] bg-[#181A1C] px-2 py-0.5 text-slate-200">{column.items.length}</span>
            </div>
            <div className="space-y-3">
              {column.items.map((project) => {
                const urgency = urgencyLabel(project.nextSequenceStepDueAt || undefined);
                const name = deriveName(project.name, project.url);
                const domain = deriveDomain(project.url);
                const missingNext = !project.nextSequenceStepDueAt;
                const isDraggingCard = draggingId === project.id;
                const icpPercent = Math.min(Math.max(project.icpScore ?? 0, 0), 100);
                const cardAccent = project.hasOverdueSequenceStep
                  ? "border-red-500/40 shadow-red-500/10"
                  : missingNext
                    ? "border-amber-500/40 shadow-amber-500/10"
                    : "border-[#232527] shadow-black/30";
                return (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={() => onDragStart(project.id)}
                    className={`space-y-2 rounded-lg bg-[#111214] p-3 transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-lg ${cardAccent} ${isDraggingCard ? "ring-1 ring-emerald-400/60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181A1C] text-xs font-semibold text-slate-200">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link href={`/projects/${project.id}/workspace`} className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                            {name}
                          </Link>
                          <p className="text-[11px] text-slate-500">{domain}</p>
                        </div>
                      </div>
                      <span className="cursor-grab text-slate-600">⋮⋮</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <Badge variant={icpBadgeVariant(project.icpScore)}>ICP {project.icpScore ?? "-"}</Badge>
                      <Badge variant="neutral">{project.status.replace(/_/g, " ")}</Badge>
                      {missingNext ? <Badge variant="warning">Missing next touch</Badge> : null}
                      {project.hasOverdueSequenceStep ? <Badge variant="error">Overdue</Badge> : null}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>ICP fit</span>
                        <span className="font-semibold text-slate-200">{icpPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#181A1C]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500"
                          style={{ width: `${icpPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className={`h-2 w-2 rounded-full ${urgency.color}`}></span>
                      <span>{urgency.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{project.nextSequenceStepDueAt ? `Next: ${formatDate(project.nextSequenceStepDueAt)}` : "Next touch: —"}</span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/${project.id}/workspace`}
                          className="rounded border border-white/10 px-2 py-1 text-[11px] text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/10"
                        >
                          Open workspace
                        </Link>
                        <StatusSelect projectId={project.id} status={project.status} onChange={(val) => handleStatusChange(project.id, val)} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {column.items.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#232527] bg-[#111214] text-xs text-slate-500">
                  🕳️ No items here. Move a project to this stage to see it.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
