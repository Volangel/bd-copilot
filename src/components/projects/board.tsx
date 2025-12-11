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

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: string; topBorder: string }> = {
  NOT_CONTACTED: { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", icon: "○", topBorder: "bg-slate-500" },
  CONTACTED: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: "◐", topBorder: "bg-cyan-500" },
  WAITING_REPLY: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "◑", topBorder: "bg-amber-500" },
  CALL_BOOKED: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "◕", topBorder: "bg-blue-500" },
  WON: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "●", topBorder: "bg-emerald-500" },
  LOST: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: "✕", topBorder: "bg-rose-500" },
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
  const [isHovered, setIsHovered] = useState(false);

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
        label: "No date",
        shortLabel: "—",
        accent: "text-slate-500",
        bg: "bg-transparent",
        border: "border-transparent",
        dot: "bg-slate-600",
        isOverdue: false,
        needsAttention: true,
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
        shortLabel: `${diffDays}d late`,
        accent: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        dot: "bg-rose-500",
        isOverdue: true,
        needsAttention: true,
      } as const;
    }

    if (date < startOfTomorrow) {
      return {
        label: `Today ${formatTime(date)}`,
        shortLabel: "Today",
        accent: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        dot: "bg-emerald-500",
        isOverdue: false,
        needsAttention: false,
      } as const;
    }

    const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dayLabel = diffDays <= 1 ? "Tomorrow" : `In ${diffDays}d`;
    return {
      label: dayLabel,
      shortLabel: dayLabel,
      accent: "text-slate-400",
      bg: "bg-transparent",
      border: "border-transparent",
      dot: "bg-slate-500",
      isOverdue: false,
      needsAttention: false,
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      data-urgency={urgency.label}
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer ${
        dragging
          ? "scale-[1.02] border-emerald-400/50 bg-[#0d1117] shadow-xl ring-2 ring-emerald-400/30"
          : isHot
          ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] to-transparent hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
          : "border-white/[0.06] bg-[#0f1115] hover:border-white/[0.12] hover:bg-[#12151a]"
      }`}
    >
      {/* Drag handle - appears on hover */}
      {onDragStart && (
        <div className={`absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
          <div className="flex flex-col gap-0.5">
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-slate-500" />
              <span className="w-1 h-1 rounded-full bg-slate-500" />
            </div>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-slate-500" />
              <span className="w-1 h-1 rounded-full bg-slate-500" />
            </div>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-slate-500" />
              <span className="w-1 h-1 rounded-full bg-slate-500" />
            </div>
          </div>
        </div>
      )}

      {/* Priority indicator - subtle left accent */}
      {isHot && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 to-emerald-600" />
      )}
      {isWarm && !isHot && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400/60 to-amber-600/60" />
      )}

      <div className={`p-3 ${onDragStart && isHovered ? "pl-6" : ""} transition-all duration-200`}>
        {/* Header row - more compact */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="min-w-0 flex-1">
            <h3 className={`truncate text-[13px] font-semibold leading-tight ${isHot ? "text-white" : "text-white/90"}`}>
              {name}
            </h3>
          </div>
          <div className={`shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
            isHot
              ? "bg-emerald-500/20 text-emerald-300"
              : isWarm
              ? "bg-amber-500/15 text-amber-300"
              : "bg-white/5 text-slate-500"
          }`}>
            {project.icpScore ?? "—"}
          </div>
        </div>

        {/* Meta row - domain and next touch inline */}
        <div className="flex items-center gap-2 mb-2">
          <span className="truncate text-[11px] text-slate-500">{domain || "—"}</span>
          {nextMeta.needsAttention && (
            <>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNextPopoverOpen((open) => !open);
                }}
                className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  nextMeta.isOverdue
                    ? "text-rose-400 hover:text-rose-300"
                    : "text-amber-400 hover:text-amber-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${nextMeta.dot} ${nextMeta.isOverdue ? "animate-pulse" : ""}`} />
                {nextMeta.shortLabel}
              </button>
            </>
          )}
          {!nextMeta.needsAttention && (
            <>
              <span className="text-slate-600">·</span>
              <span className={`text-[11px] ${nextMeta.accent}`}>{nextMeta.shortLabel}</span>
            </>
          )}
        </div>

        {/* Quick schedule popover - positioned above the meta row */}
        {isNextPopoverOpen && (
          <div
            className="absolute left-3 right-3 top-14 z-30 rounded-lg border border-white/10 bg-[#0d1117]/98 p-2 shadow-xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-1 mb-2">
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] text-white/80 transition hover:bg-emerald-500/20 hover:text-emerald-300"
                onClick={() => handleSetDateAndClose(today)}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Today
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] text-white/80 transition hover:bg-amber-500/20 hover:text-amber-300"
                onClick={() => handleSetDateAndClose(tomorrow)}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Tomorrow
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] text-white/80 transition hover:bg-blue-500/20 hover:text-blue-300"
                onClick={() => handleSetDateAndClose(nextWeek)}
              >
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                +7 days
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                onClick={() => handleSetDateAndClose(null)}
              >
                <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
              className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white focus:border-emerald-400/40 focus:outline-none"
            />
          </div>
        )}

        {/* Tags row - cleaner */}
        <div className="flex items-center gap-1.5">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="truncate rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-500"
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-[10px] text-slate-600">+{tags.length - 2}</span>
          )}
          <div className="flex-1" />
          {project.mqaScore && (
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400/80">
              {project.mqaScore}
            </span>
          )}
          <span className="rounded bg-white/[0.04] px-1 py-0.5 text-[9px] text-slate-600">
            {channelIcon}
          </span>
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

      {/* Toolbar - unified compact bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => setMode("board")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
              mode === "board"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-white"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Board
          </button>
          <button
            type="button"
            onClick={() => setMode("today")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
              mode === "today"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-white"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Today
            {todayProjects.length > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-400">
                {todayProjects.length}
              </span>
            )}
          </button>
        </div>

        <div className="h-5 w-px bg-white/[0.06]" />

        {/* Filter pills - more compact */}
        {filterPills.map((pill) => (
          <button
            key={pill.key}
            type="button"
            onClick={() => setFilters((f) => ({ ...f, [pill.key]: !f[pill.key] }))}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
              filters[pill.key]
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-slate-500 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <span className="text-xs">{pill.icon}</span>
            {pill.label}
          </button>
        ))}

        <div className="h-5 w-px bg-white/[0.06]" />

        {/* Sort - inline */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          Sort
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as "next" | "icp")}
            className="rounded-md border-0 bg-transparent px-1 py-1 text-xs text-white cursor-pointer focus:outline-none hover:bg-white/[0.04]"
          >
            <option value="next" className="bg-[#0a0c10]">Next touch</option>
            <option value="icp" className="bg-[#0a0c10]">ICP score</option>
          </select>
        </div>

        {/* Spacer to push search right */}
        <div className="flex-1" />

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setFilters({ hotOnly: false, missingNext: false, overdueOnly: false });
              setSearchTerm("");
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-500 transition hover:text-white hover:bg-white/[0.04]"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}

        {/* Search - compact */}
        <div className="relative w-48">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border-0 bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-600 transition-all duration-150 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* Board view */}
      {mode === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
          {grouped.map((column) => {
            const stats = laneSnapshot(column.items);
            const config = statusConfig[column.status];
            const isDropTarget = hoveredStatus === column.status && draggingId;

            return (
              <div
                key={column.status}
                className={`flex w-[280px] min-w-[280px] flex-col rounded-xl transition-all duration-200 ${
                  isDropTarget
                    ? "bg-emerald-500/[0.08] ring-2 ring-emerald-400/30 ring-inset"
                    : "bg-white/[0.015]"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setHoveredStatus(column.status)}
                onDragLeave={() => setHoveredStatus(null)}
                onDrop={() => {
                  onDrop(column.status);
                  setHoveredStatus(null);
                }}
              >
                {/* Column header - sticky */}
                <div className="sticky top-0 z-10 shrink-0 px-3 pb-2 pt-3 bg-[#0a0c10]/95 backdrop-blur-sm rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${config.topBorder}`} />
                    <h2 className="text-xs font-semibold text-white/80 uppercase tracking-wide whitespace-nowrap">
                      {column.status.replace(/_/g, " ")}
                    </h2>
                    <span className="text-xs font-medium text-slate-500">
                      {column.items.length}
                    </span>
                    {/* Compact inline stats */}
                    <div className="flex-1" />
                    {stats.overdue > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-rose-400">
                        <span className="h-1 w-1 rounded-full bg-rose-400 animate-pulse" />
                        {stats.overdue}
                      </span>
                    )}
                    {stats.hot > 0 && (
                      <span className="text-[10px] font-medium text-emerald-400">{stats.hot}🔥</span>
                    )}
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2" style={{ maxHeight: "calc(100vh - 320px)" }}>
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
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06] px-4 py-6 text-center">
                      <span className={`text-lg mb-1 opacity-40 ${config.color}`}>{config.icon}</span>
                      <p className="text-[10px] text-slate-600">No leads</p>
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
