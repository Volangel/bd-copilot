"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Project } from "@prisma/client";
import { PROJECT_STATUSES, formatDate } from "@/lib/utils";
import { Toast } from "@/components/ui/toast";
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
      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:border-emerald-400/40 hover:bg-white/8 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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

type NextTouchMeta = { label: string; color: string };

type LeadCardProps = {
  project: BoardProject;
  name: string;
  domain: string;
  tags: string[];
  urgency: NextTouchMeta;
  dragging: boolean;
  onDragStart?: () => void;
  onChangeNextTouch?: (projectId: string, nextTouch: Date | null) => void;
  onOpenWorkspace?: (projectId: string) => void;
  onOpenMessages?: (projectId: string) => void;
  onAddNote?: (projectId: string) => void;
  onSelect: () => void;
};

const helperByStatus: Record<string, string> = {
  NOT_CONTACTED: "Cold leads waiting for first touch",
  CONTACTED: "Initial outreach sent",
  WAITING_REPLY: "Awaiting prospect response",
  CALL_BOOKED: "Meeting scheduled",
  WON: "Successfully closed",
  LOST: "No longer active",
};

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  NOT_CONTACTED: { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", icon: "○" },
  CONTACTED: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: "◐" },
  WAITING_REPLY: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "◑" },
  CALL_BOOKED: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "◕" },
  WON: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "●" },
  LOST: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: "✕" },
};

function normalizeNextTouch(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function selectTodayLeads(projects: BoardProject[], now: Date = new Date()): BoardProject[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const overdue: { project: BoardProject; nextTouch: Date }[] = [];
  const today: { project: BoardProject; nextTouch: Date }[] = [];

  projects.forEach((project) => {
    const nextTouch = normalizeNextTouch(project.nextSequenceStepDueAt);
    if (!nextTouch) return;

    if (nextTouch < startOfToday) {
      overdue.push({ project, nextTouch });
    } else if (nextTouch < endOfToday) {
      today.push({ project, nextTouch });
    }
  });

  overdue.sort((a, b) => a.nextTouch.getTime() - b.nextTouch.getTime());
  today.sort((a, b) => (b.project.icpScore ?? 0) - (a.project.icpScore ?? 0));

  return [...overdue, ...today].map((item) => item.project);
}

function LeadCard({
  project,
  name,
  domain,
  tags,
  urgency,
  dragging,
  onDragStart,
  onChangeNextTouch,
  onSelect,
}: LeadCardProps) {
  const [isNextPopoverOpen, setIsNextPopoverOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const handleChangeNextTouch = onChangeNextTouch ?? (() => {});

  const handleSetDateAndClose = (date: Date | null) => {
    handleChangeNextTouch(project.id, date);
    setIsNextPopoverOpen(false);
  };

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const nextTouch = normalizeNextTouch(project.nextSequenceStepDueAt);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const describeNextTouch = (date: Date | null) => {
    if (!date) {
      return {
        label: "Not scheduled",
        accent: "text-slate-500",
        bg: "bg-slate-500/5",
        border: "border-slate-500/20",
        dot: "bg-slate-600",
        isOverdue: false,
      } as const;
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    if (date < startOfToday) {
      const diffMs = startOfToday.getTime() - date.getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        label: `${diffDays}d overdue`,
        accent: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        dot: "bg-rose-500",
        isOverdue: true,
      } as const;
    }

    if (date < startOfTomorrow) {
      return {
        label: `Today ${formatTime(date)}`,
        accent: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        dot: "bg-emerald-500",
        isOverdue: false,
      } as const;
    }

    const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dayLabel = diffDays <= 1 ? "Tomorrow" : `In ${diffDays}d`;
    return {
      label: dayLabel,
      accent: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      dot: "bg-amber-500",
      isOverdue: false,
    } as const;
  };

  const nextMeta = describeNextTouch(nextTouch);
  const isHot = (project.icpScore ?? 0) >= 80;
  const isWarm = (project.icpScore ?? 0) >= 60;

  const channelIcon = (() => {
    if (project.telegram) return "TG";
    if (project.twitter) return "X";
    return "✉";
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      data-urgency={urgency.label}
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        dragging
          ? "scale-[1.02] border-emerald-400/60 bg-[#0d1117] shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-400/30"
          : "border-white/[0.06] bg-gradient-to-b from-[#12161c] to-[#0f1318] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20"
      }`}
    >
      {/* Priority indicator */}
      {isHot && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
      )}
      {isWarm && !isHot && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
      )}

      <div className={`space-y-3 p-4 ${isHot || isWarm ? "pl-5" : ""}`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold text-white/95 group-hover:text-white">
              {name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">{domain || "—"}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isHot && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                HOT
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
              isHot
                ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                : isWarm
                ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
                : "bg-white/5 text-slate-400 ring-white/10"
            }`}>
              ICP {project.icpScore ?? "—"}
            </span>
          </div>
        </div>

        {/* Next touch row */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsNextPopoverOpen((open) => !open);
            }}
            className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 ${nextMeta.border} ${nextMeta.bg} hover:brightness-110`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${nextMeta.dot} ${nextMeta.isOverdue ? "animate-pulse" : ""}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Next touch</p>
              <p className={`text-sm font-medium ${nextMeta.accent}`}>{nextMeta.label}</p>
            </div>
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Date picker popover */}
          {isNextPopoverOpen && (
            <div
              className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-white/10 bg-[#0d1117]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                  onClick={() => handleSetDateAndClose(today)}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Today
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                  onClick={() => handleSetDateAndClose(tomorrow)}
                >
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Tomorrow
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                  onClick={() => handleSetDateAndClose(nextWeek)}
                >
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Next week
                </button>
                <div className="my-2 border-t border-white/10" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"
                  onClick={() => handleSetDateAndClose(null)}
                >
                  <span className="h-2 w-2 rounded-full bg-slate-600" />
                  Clear
                </button>
              </div>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split("-").map(Number);
                    const date = new Date(year, month - 1, day, 12, 0, 0);
                    handleSetDateAndClose(date);
                  }
                }}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
            {tags.length === 0 ? (
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-white/10">
                No tags
              </span>
            ) : (
              tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="truncate rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-white/10"
                >
                  {tag}
                </span>
              ))
            )}
            {tags.length > 3 && (
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-white/10">
                +{tags.length - 3}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {project.mqaScore ? (
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 ring-1 ring-blue-500/30">
                MQA {project.mqaScore}
              </span>
            ) : null}
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[10px] font-medium text-slate-400 ring-1 ring-white/10">
              {channelIcon}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Board({ projects }: { projects: BoardProject[] }) {
  const [localProjects, setLocalProjects] = useState(projects);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<BoardProject | null>(null);
  const [mode, setMode] = useState<"board" | "today">("board");
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

  const TodayView = ({
    projects,
    onChangeNextTouch,
  }: {
    projects: BoardProject[];
    onChangeNextTouch: (projectId: string, nextTouch: Date | null) => void;
  }) => {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Today&apos;s Focus</h2>
              <p className="text-sm text-slate-500">Overdue and due today, sorted by priority</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {projects.map((project) => {
            const name = deriveName(project.name, project.url);
            const domain = deriveDomain(project.url);
            const tags = deriveTags(project.categoryTags);
            const urgency = urgencyLabel(project.nextSequenceStepDueAt || undefined);

            return (
              <LeadCard
                key={project.id}
                project={project}
                name={name}
                domain={domain}
                tags={tags}
                urgency={urgency}
                dragging={false}
                onChangeNextTouch={onChangeNextTouch}
                onSelect={() => setSelectedProject(project)}
              />
            );
          })}
          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/80">All caught up!</p>
              <p className="mt-1 text-xs text-slate-500">No tasks due today. Schedule next touches to stay proactive.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const urgencyLabel = (nextSequenceStepDueAt?: Date | null): NextTouchMeta => {
    if (!nextSequenceStepDueAt) return { label: "Not set", color: "text-slate-400" };
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    if (nextSequenceStepDueAt < startOfToday) return { label: "Overdue", color: "text-red-300" };
    if (nextSequenceStepDueAt >= startOfToday && nextSequenceStepDueAt < endOfToday)
      return { label: "Today", color: "text-emerald-300" };
    const diffDays = Math.round((nextSequenceStepDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const label = diffDays <= 7 ? `In ${diffDays}d` : "Upcoming";
    return { label, color: "text-amber-200" };
  };

  const laneSnapshot = (items: BoardProject[]) => {
    const hot = items.filter((p) => (p.icpScore ?? 0) >= 80).length;
    const missingNext = items.filter((p) => !p.nextSequenceStepDueAt).length;
    const overdue = items.filter((p) => p.hasOverdueSequenceStep).length;
    return { hot, missingNext, overdue };
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredProjects = localProjects.filter((p) => {
    if (filters.hotOnly && (p.icpScore ?? 0) < 80) return false;
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

  const todayProjects = useMemo(() => selectTodayLeads(filteredProjects), [filteredProjects]);

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

  const handleNextTouchChange = async (projectId: string, nextTouch: Date | null) => {
    setLocalProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          nextSequenceStepDueAt: nextTouch,
          hasOverdueSequenceStep: (() => {
            if (!nextTouch) return false;
            const now = new Date();
            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);
            return nextTouch < startOfToday;
          })(),
        };
      })
    );

    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextSequenceStepDueAt: nextTouch ? nextTouch.toISOString() : null,
        }),
      });
      setMessage("Next touch updated");
      setError(null);
    } catch (err) {
      console.error("Failed to update next touch", err);
      setError("Failed to update next touch");
    }
  };

  const onDragStart = (projectId: string) => {
    setDraggingId(projectId);
  };

  const onDrop = async (status: string) => {
    if (!draggingId) return;
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

  const filterPills = [
    { key: "hotOnly" as const, label: "Hot leads", icon: "🔥", description: "ICP ≥ 80" },
    { key: "missingNext" as const, label: "No next touch", icon: "⏰", description: "Needs scheduling" },
    { key: "overdueOnly" as const, label: "Overdue", icon: "⚠️", description: "Past due date" },
  ];

  return (
    <div className="w-full">
      <Toast message={message} onClear={() => setMessage(null)} />
      <Toast message={error} type="error" onClear={() => setError(null)} />

      {/* Toolbar */}
      <div className="mb-6 space-y-4">
        {/* View toggle and search row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
            <button
              type="button"
              onClick={() => setMode("board")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                mode === "board"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Board
            </button>
            <button
              type="button"
              onClick={() => setMode("today")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                mode === "today"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Today
              {todayProjects.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  {todayProjects.length}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-xl border-0 bg-white/[0.03] py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 ring-1 ring-white/[0.06] transition-all duration-200 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, [pill.key]: !f[pill.key] }))}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 ring-1 ${
                filters[pill.key]
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
                  : "bg-white/[0.02] text-slate-400 ring-white/[0.06] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="text-sm">{pill.icon}</span>
              <span className="font-medium">{pill.label}</span>
            </button>
          ))}

          <div className="mx-2 h-6 w-px bg-white/10" />

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sort by</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "next" | "icp")}
              className="rounded-lg border-0 bg-white/[0.03] px-3 py-2 text-sm text-white ring-1 ring-white/[0.06] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="next">Next touch</option>
              <option value="icp">ICP score</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <>
              <div className="mx-2 h-6 w-px bg-white/10" />
              <button
                type="button"
                onClick={() => {
                  setFilters({ hotOnly: false, missingNext: false, overdueOnly: false });
                  setSearchTerm("");
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear filters
              </button>
            </>
          )}
        </div>
      </div>

      {/* Board view */}
      {mode === "board" ? (
        <div className="grid grid-cols-1 gap-5 pb-6 md:auto-cols-[minmax(320px,1fr)] md:grid-flow-col md:overflow-x-auto md:pb-4">
          {grouped.map((column) => {
            const stats = laneSnapshot(column.items);
            const config = statusConfig[column.status];
            const isDropTarget = hoveredStatus === column.status && draggingId;

            return (
              <div
                key={column.status}
                className={`flex min-h-[400px] flex-col rounded-2xl border transition-all duration-200 ${
                  isDropTarget
                    ? "border-emerald-400/50 bg-emerald-500/5 ring-2 ring-emerald-400/20"
                    : draggingId
                    ? "border-white/[0.08] bg-white/[0.01]"
                    : "border-white/[0.04] bg-white/[0.01]"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setHoveredStatus(column.status)}
                onDragLeave={() => setHoveredStatus(null)}
                onDrop={() => {
                  onDrop(column.status);
                  setHoveredStatus(null);
                }}
              >
                {/* Column header */}
                <div className="border-b border-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-lg ${config.color}`}>{config.icon}</span>
                      <h2 className="text-sm font-semibold text-white">
                        {column.status.replace(/_/g, " ")}
                      </h2>
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/10 px-1.5 text-xs font-medium text-slate-300">
                        {column.items.length}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{helperByStatus[column.status]}</p>

                  {/* Stats row */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stats.hot > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                        🔥 {stats.hot} hot
                      </span>
                    )}
                    {stats.missingNext > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 ring-1 ring-amber-500/30">
                        ⏰ {stats.missingNext} unscheduled
                      </span>
                    )}
                    {stats.overdue > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 ring-1 ring-rose-500/30">
                        ⚠️ {stats.overdue} overdue
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {column.items.map((project) => {
                    const urgency = urgencyLabel(project.nextSequenceStepDueAt || undefined);
                    const name = deriveName(project.name, project.url);
                    const domain = deriveDomain(project.url);
                    const tags = deriveTags(project.categoryTags);
                    const isDraggingCard = draggingId === project.id;
                    return (
                      <LeadCard
                        key={project.id}
                        project={project}
                        name={name}
                        domain={domain}
                        tags={tags}
                        urgency={urgency}
                        dragging={isDraggingCard}
                        onDragStart={() => onDragStart(project.id)}
                        onChangeNextTouch={handleNextTouchChange}
                        onSelect={() => setSelectedProject(project)}
                      />
                    );
                  })}
                  {column.items.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] px-4 py-8 text-center">
                      <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${config.bg} ring-1 ${config.border}`}>
                        <span className={`text-lg ${config.color}`}>{config.icon}</span>
                      </div>
                      <p className="text-xs text-slate-500">No leads in this stage</p>
                      <p className="mt-0.5 text-[11px] text-slate-600">Drag cards here to move them</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <TodayView projects={todayProjects} onChangeNextTouch={handleNextTouchChange} />
      )}

      {/* Side panel */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedProject(null)}
          />
          <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/[0.06] bg-[#0a0c10]/95 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0a0c10]/95 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-white">
                    {deriveName(selectedProject.name, selectedProject.url)}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {deriveDomain(selectedProject.url) || "No domain"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${statusConfig[selectedProject.status].bg} ${statusConfig[selectedProject.status].color} ring-1 ${statusConfig[selectedProject.status].border}`}>
                  {statusConfig[selectedProject.status].icon} {selectedProject.status.replace(/_/g, " ")}
                </span>
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                  (selectedProject.icpScore ?? 0) >= 80
                    ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-white/5 text-slate-400 ring-1 ring-white/10"
                }`}>
                  ICP {selectedProject.icpScore ?? "—"}
                </span>
                {selectedProject.mqaScore && (
                  <span className="inline-flex items-center rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 ring-1 ring-blue-500/30">
                    MQA {selectedProject.mqaScore}
                  </span>
                )}
                {selectedProject.hasOverdueSequenceStep && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                    Overdue
                  </span>
                )}
              </div>

              {/* Next touch */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Next touch</p>
                    <p className={`mt-1 text-sm font-medium ${urgencyLabel(selectedProject.nextSequenceStepDueAt || undefined).color}`}>
                      {urgencyLabel(selectedProject.nextSequenceStepDueAt || undefined).label}
                      {selectedProject.nextSequenceStepDueAt && (
                        <span className="ml-2 text-slate-500">{formatDate(selectedProject.nextSequenceStepDueAt)}</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${selectedProject.id}/workspace`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/20"
                  >
                    Open workspace
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Overview</p>
                <p className="text-sm leading-relaxed text-slate-300">
                  {selectedProject.summary || selectedProject.playbookSummary || "No summary available. Add one in the workspace."}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {deriveTags(selectedProject.categoryTags).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-300 ring-1 ring-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {selectedProject.url && (
                  <Link
                    href={selectedProject.url}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    {selectedProject.url}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                )}
              </div>

              {/* Stage selector */}
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Stage</p>
                <StatusSelect
                  projectId={selectedProject.id}
                  status={selectedProject.status}
                  onChange={(next) => {
                    handleStatusChange(selectedProject.id, next);
                    setSelectedProject((prev) => (prev ? { ...prev, status: next } : prev));
                  }}
                />
              </div>

              {/* Helper text */}
              <p className="rounded-lg bg-white/[0.02] p-3 text-xs text-slate-500 ring-1 ring-white/[0.04]">
                Use the workspace to log touches, set next dates, or update contacts. This panel keeps context without leaving the board.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
