"use client";

import Link from "next/link";
import { useState } from "react";
import { Project } from "@prisma/client";
import { PROJECT_STATUSES, formatDate } from "@/lib/utils";
import { Toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { parseJsonString } from "@/lib/parsers";

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
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
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

  const deriveTags = (raw?: string | null) => {
    const parsed = parseJsonString<string[]>(raw || null, []);
    if (parsed.length > 0) return parsed;
    if (!raw) return [];
    return raw
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  };

  const deriveSummary = (project: Project) => {
    const summary = project.summary || project.painPoints || project.playbookSummary || project.stage || project.targetUsers;
    if (!summary) return "Add a quick summary so anyone can scan this account.";
    return summary.length > 160 ? `${summary.slice(0, 157)}…` : summary;
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

  const laneSnapshot = (items: BoardProject[]) => {
    const hot = items.filter((p) => (p.icpScore ?? 0) >= 80).length;
    const missingNext = items.filter((p) => !p.nextSequenceStepDueAt).length;
    const overdue = items.filter((p) => p.hasOverdueSequenceStep).length;
    return { hot, missingNext, overdue };
  };

  const priorityPick = (items: BoardProject[]) => {
    if (items.length === 0) return null;
    const overdue = items.find((p) => p.hasOverdueSequenceStep);
    if (overdue) return overdue;
    const nextByDate = items
      .filter((p) => !!p.nextSequenceStepDueAt)
      .sort((a, b) => (a.nextSequenceStepDueAt && b.nextSequenceStepDueAt ? a.nextSequenceStepDueAt.getTime() - b.nextSequenceStepDueAt.getTime() : 0));
    if (nextByDate.length > 0) return nextByDate[0];
    return items[0];
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

  const statusAccent: Record<string, string> = {
    NOT_CONTACTED: "from-slate-900 via-slate-900/80 to-slate-950",
    CONTACTED: "from-cyan-950 via-cyan-900/50 to-slate-950",
    WAITING_REPLY: "from-amber-950 via-amber-900/50 to-slate-950",
    CALL_BOOKED: "from-blue-950 via-blue-900/50 to-slate-950",
    WON: "from-emerald-950 via-emerald-900/50 to-slate-950",
    LOST: "from-rose-950 via-rose-900/50 to-slate-950",
  };

  const filterPills = [
    {
      key: "hotOnly" as const,
      label: "ICP > 80",
      description: "Top-fit accounts",
      activeClass: "border-emerald-400 bg-emerald-500/10 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]",
      inactiveClass: "border-slate-700 bg-[#181A1C] hover:border-slate-500",
    },
    {
      key: "missingNext" as const,
      label: "Missing next touch",
      description: "Add next step",
      activeClass: "border-amber-400 bg-amber-500/10 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]",
      inactiveClass: "border-slate-700 bg-[#181A1C] hover:border-slate-500",
    },
    {
      key: "overdueOnly" as const,
      label: "Overdue only",
      description: "Needs rescue",
      activeClass: "border-red-400 bg-red-500/10 text-red-200 shadow-[0_0_0_1px_rgba(248,113,113,0.25)]",
      inactiveClass: "border-slate-700 bg-[#181A1C] hover:border-slate-500",
    },
  ];

  return (
    <div className="space-y-4">
      <Toast message={message} onClear={() => setMessage(null)} />
      <Toast message={error} type="error" onClear={() => setError(null)} />
      <div className="space-y-3 rounded-2xl border border-[#1D2024] bg-[#0C0D0F] p-4 text-xs text-slate-200 shadow-inner shadow-black/40">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Guided focus
          </div>
          <p className="text-sm text-slate-300">
            {activeFilterCount > 0 ? `${activeFilterCount} refinement${activeFilterCount > 1 ? "s" : ""} applied` : "Tune the board to spotlight the next best work."}
          </p>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setFilters({ hotOnly: false, missingNext: false, overdueOnly: false });
                setSearchTerm("");
                setSortMode("next");
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200 transition hover:border-emerald-400 hover:bg-emerald-500/10"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Reset view
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, [pill.key]: !f[pill.key] }))}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                filters[pill.key] ? pill.activeClass : pill.inactiveClass
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide text-slate-400">{pill.description}</span>
              <span className="text-[13px] font-semibold text-slate-100">{pill.label}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr] md:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-[#232527] bg-[#111214] px-3 py-2 text-xs text-slate-200 shadow-inner shadow-black/50">
            <span className="rounded-full bg-[#0F1012] px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">Search</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or domain"
              className="w-full bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#232527] bg-[#111214] px-3 py-2 text-xs text-slate-200 shadow-inner shadow-black/50">
            <div className="flex flex-col leading-tight text-[11px] text-slate-400">
              <span className="uppercase tracking-wide text-slate-300">Lane sort</span>
              <span className="text-[10px] text-slate-500">Next touch or ICP priority</span>
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "next" | "icp")}
              className="rounded-md border border-[#2D3136] bg-[#0F1012] px-2 py-1 text-xs text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="next">Next touch</option>
              <option value="icp">ICP</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1C1F23] bg-[#0D0E10] p-4 text-xs text-slate-200 shadow-inner shadow-black/40">
        <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/5 px-3 py-1 text-[11px] uppercase tracking-wide text-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Calm view
        </div>
        <p className="text-sm text-slate-300">
          Smooth drag, inline status, and guided cues keep the pipeline readable and fast to work.
        </p>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">Drag glow</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">Lane helpers</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {grouped.map((column) => {
          const stats = laneSnapshot(column.items);
          const laneFocus = priorityPick(column.items);
          const laneFocusName = laneFocus ? deriveName(laneFocus.name, laneFocus.url) : null;
          const laneFocusUrgency = laneFocus ? urgencyLabel(laneFocus.nextSequenceStepDueAt || undefined) : null;

          return (
            <div
              key={column.status}
              className={`group relative min-h-[420px] rounded-2xl border border-[#232527] bg-gradient-to-b ${
                statusAccent[column.status]
              } p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${draggingId ? "ring-1 ring-emerald-500/30" : ""} ${
                hoveredStatus === column.status ? "border-emerald-400/50 shadow-emerald-500/10" : ""
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setHoveredStatus(column.status)}
              onDragLeave={() => setHoveredStatus(null)}
              onDrop={() => {
                onDrop(column.status);
                setHoveredStatus(null);
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-slate-300 shadow-inner shadow-black/30">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-white">{column.status.replace(/_/g, " ")}</span>
                  <p className="text-[11px] text-slate-400">{helperByStatus[column.status] || ""}</p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Hot fit {stats.hot}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Missing {stats.missingNext}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-300" /> Overdue {stats.overdue}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                  <span className="rounded-full bg-[#181A1C] px-2 py-0.5 text-white">{column.items.length}</span>
                  <span className="rounded-full bg-[#111214] px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">{sortMode === "icp" ? "ICP" : "Next"}</span>
                </div>
              </div>
              {laneFocus ? (
                <div className="mb-3 rounded-lg border border-white/10 bg-[#0F1012] px-3 py-2 text-[11px] text-slate-200 shadow-sm shadow-black/20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold text-white">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> Lane focus
                    </span>
                    {laneFocusUrgency ? (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${laneFocusUrgency.color === "bg-red-500" ? "border-red-400/60 bg-red-500/10 text-red-100" : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"}`}>
                        <span className={`h-2 w-2 rounded-full ${laneFocusUrgency.color}`} />
                        {laneFocusUrgency.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-white">{laneFocusName}</p>
                  <p className="text-[11px] text-slate-400">Clear this first to unlock the lane.</p>
                </div>
              ) : null}
              <div className="space-y-3">
                {column.items.map((project) => {
                const urgency = urgencyLabel(project.nextSequenceStepDueAt || undefined);
                const name = deriveName(project.name, project.url);
                const domain = deriveDomain(project.url);
                const missingNext = !project.nextSequenceStepDueAt;
                const isDraggingCard = draggingId === project.id;
                const cardAccent = project.hasOverdueSequenceStep
                  ? "border-red-500/40 shadow-red-500/10"
                  : missingNext
                    ? "border-amber-500/40 shadow-amber-500/10"
                    : "border-[#1F2529] shadow-black/30";
                const tags = deriveTags(project.categoryTags);
                const summary = deriveSummary(project);
                return (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={() => onDragStart(project.id)}
                    className={`relative overflow-hidden rounded-xl border bg-[#0F1114] p-3 transition-all duration-150 ease-out hover:-translate-y-[2px] hover:shadow-xl ${cardAccent} ${
                      isDraggingCard
                        ? "ring-2 ring-emerald-400/60 shadow-emerald-500/20"
                        : "shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
                    }`}
                  >
                    <div className="relative space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 rounded-full border border-emerald-400/40 bg-[#0B0D10] text-[11px] font-semibold uppercase text-emerald-100 shadow-inner shadow-emerald-500/20">
                            <div className="absolute -inset-[1px] rounded-full bg-gradient-to-br from-emerald-500/20 via-cyan-400/10 to-blue-400/20 blur" />
                            <div className="relative flex h-full w-full items-center justify-center">{name.slice(0, 2).toUpperCase()}</div>
                          </div>
                          <div className="space-y-1">
                            <Link
                              href={`/projects/${project.id}/workspace`}
                              className="block text-sm font-semibold text-white transition hover:text-emerald-200"
                            >
                              {name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              <span className="truncate max-w-[180px]">{domain || "No domain"}</span>
                              <span className="h-1 w-1 rounded-full bg-slate-600" />
                              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                                {project.status.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-[11px] text-slate-300">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-2 py-1 ${
                              project.hasOverdueSequenceStep
                                ? "border border-red-500/40 bg-red-500/10 text-red-100"
                                : "border border-white/10 bg-white/5"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${urgency.color}`} />
                            {project.nextSequenceStepDueAt ? `Next by ${formatDate(project.nextSequenceStepDueAt)}` : "Add next touch"}
                          </span>
                          <StatusSelect projectId={project.id} status={project.status} onChange={(val) => handleStatusChange(project.id, val)} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">ICP</span>
                          <span className="text-sm font-semibold text-white">{project.icpScore ?? "–"}</span>
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">MQA</span>
                          <span className="text-sm font-semibold text-white">{project.mqaScore ?? "–"}</span>
                        </span>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 ${
                            project.hasOverdueSequenceStep
                              ? "border-red-500/40 bg-red-500/10 text-red-100"
                              : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${urgency.color}`} />
                          {urgency.label}
                        </span>
                      </div>

                      <div className="space-y-2 rounded-lg border border-white/5 bg-[#0B0D10]/80 p-3 shadow-inner shadow-black/20">
                        <p className="text-xs text-slate-200 line-clamp-2">{summary}</p>
                        {tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100">
                                {tag}
                              </span>
                            ))}
                            {tags.length > 4 ? (
                              <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-slate-300">+{tags.length - 4} more</span>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={icpBadgeVariant(project.icpScore)} className="bg-white/5 px-2 py-1">
                              ICP {project.icpScore ?? "-"}
                            </Badge>
                            {missingNext ? <Badge variant="warning">Missing next touch</Badge> : null}
                            {project.hasOverdueSequenceStep ? <Badge variant="error">Overdue</Badge> : null}
                          </div>
                          <Link
                            href={`/projects/${project.id}/workspace`}
                            className="rounded border border-white/10 px-2 py-1 text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/10"
                          >
                            Open workspace
                          </Link>
                        </div>
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
        );
      })}
      </div>
    </div>
  );
}
