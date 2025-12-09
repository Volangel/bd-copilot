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
      className="rounded-md border border-white/10 bg-[#0F1012] px-2 py-1 text-[11px] text-slate-100 shadow-sm transition hover:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
  NOT_CONTACTED: "Cold leads",
  CONTACTED: "Initial touch",
  WAITING_REPLY: "Awaiting response",
  CALL_BOOKED: "Meeting arranged",
  WON: "Closed deals",
  LOST: "Inactive",
};

const statusTopBorder: Record<string, string> = {
  NOT_CONTACTED: "bg-slate-600",
  CONTACTED: "bg-cyan-500",
  WAITING_REPLY: "bg-amber-500",
  CALL_BOOKED: "bg-blue-500",
  WON: "bg-emerald-500",
  LOST: "bg-rose-500",
};

function getPriorityBarClasses(icpScore?: number, isHot?: boolean) {
  if (isHot || (icpScore ?? 0) >= 80) return "w-1 rounded-l-md bg-emerald-500";
  if ((icpScore ?? 0) >= 60) return "w-1 rounded-l-md bg-amber-500";
  return "w-1 rounded-l-md bg-slate-600";
}

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
  onOpenWorkspace,
  onOpenMessages,
  onAddNote,
  onSelect,
}: LeadCardProps) {
  const [isNextPopoverOpen, setIsNextPopoverOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const priorityBarClassName = getPriorityBarClasses(project.icpScore, (project.icpScore ?? 0) >= 80);
  const handleChangeNextTouch =
    onChangeNextTouch ?? ((projectId: string, nextTouch: Date | null) => console.log("TODO: change next touch", projectId, nextTouch));
  const handleOpenWorkspace = onOpenWorkspace ?? ((projectId: string) => console.log("TODO: workspace", projectId));
  const handleOpenMessages = onOpenMessages ?? ((projectId: string) => console.log("TODO: messages", projectId));
  const handleAddNote = onAddNote ?? ((projectId: string) => console.log("TODO: add note", projectId));
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
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const describeNextTouch = (date: Date | null) => {
    if (!date) {
      return {
        label: "No next touch",
        accent: "text-slate-400",
        border: "border-slate-800",
        dot: "bg-slate-500",
        helper: "⚠️",
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
        label: `Overdue by ${diffDays}d`,
        accent: "text-rose-300",
        border: "border-rose-500/50",
        dot: "bg-rose-400",
        helper: "•",
      } as const;
    }

    if (date < startOfTomorrow) {
      return {
        label: `Today at ${formatTime(date)}`,
        accent: "text-emerald-200",
        border: "border-emerald-400/40",
        dot: "bg-emerald-400",
        helper: "•",
      } as const;
    }

    const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dayLabel = diffDays <= 1 ? "Tomorrow" : `In ${diffDays}d`;
    return {
      label: `${dayLabel} at ${formatTime(date)}`,
      accent: "text-amber-200",
      border: "border-amber-400/30",
      dot: "bg-amber-300",
      helper: "•",
    } as const;
  };

  const nextMeta = describeNextTouch(nextTouch);

  const channelIcon = (() => {
    if (project.telegram) return "📨";
    if (project.twitter) return "🐦";
    return "✉";
  })();

  const ownerInitial = (name || domain || "?").trim().charAt(0).toUpperCase() || "?";

  const heatChip = (score?: number | null) => {
    if (score === null || score === undefined) return null;
    if (score >= 80) return { label: "Hot", className: "bg-rose-500/15 text-rose-200 border border-rose-400/40" };
    if (score >= 60) return { label: "Warm", className: "bg-amber-500/10 text-amber-200 border border-amber-400/30" };
    return null;
  };

  const icpChipClass = (score?: number | null) => {
    if ((score ?? 0) >= 80) return "border-emerald-400/70 bg-emerald-500/10 text-emerald-100";
    return "border-white/10 bg-white/5 text-slate-200";
  };

  return (
    <div className="group relative flex">
      <div className={priorityBarClassName} />
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
        className={`relative flex-1 rounded-md px-3 py-3 space-y-3 text-left leading-tight transition-all duration-150 bg-[#0E1013]/70 border border-white/5 ${
          dragging ? "ring-2 ring-emerald-400/60" : ""
        }`}
      >
        <div
          className="
            absolute top-1 right-1
            flex items-center gap-1
            rounded-full bg-black/70
            px-2 py-1
            text-[10px] text-gray-200
            opacity-0 pointer-events-none
            group-hover:opacity-100 group-hover:pointer-events-auto
            transition
            z-20
          "
        >
          <button className="hover:text-white" onClick={() => handleChangeNextTouch(project.id, null)}>
            Next
          </button>
          <button className="hover:text-white" onClick={() => handleOpenWorkspace(project.id)}>
            WS
          </button>
          <button className="hover:text-white" onClick={() => handleOpenMessages(project.id)}>
            Msg
          </button>
          <button className="hover:text-white" onClick={() => handleAddNote(project.id)}>
            Note
          </button>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5 leading-tight">
            <p className="max-w-full truncate text-sm font-semibold text-white">{name}</p>
            <p className="block truncate text-[12px] text-gray-500">{domain || "No domain"}</p>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] font-semibold ${icpChipClass(project.icpScore)}`}
            >
              ICP {project.icpScore ?? "–"}
            </span>
            {heatChip(project.icpScore) ? (
              <span className={`inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-semibold ${heatChip(project.icpScore)?.className}`}>
                {heatChip(project.icpScore)?.label}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-3 rounded-lg border bg-black/30 px-3 py-2 text-[12px] shadow-inner transition ${nextMeta.border}`}
        >
          <div className="flex items-center gap-2 text-left">
            <span className={`h-2 w-2 rounded-full ${nextMeta.dot}`} />
            <button
              type="button"
              className={`flex items-center gap-2 font-medium ${nextMeta.accent} hover:text-white`}
              onClick={(e) => {
                e.stopPropagation();
                setIsNextPopoverOpen((open) => !open);
              }}
            >
              <span className="text-slate-400">Next touch:</span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                {nextMeta.helper ? <span className="text-[11px]">{nextMeta.helper}</span> : null}
                <span>{nextMeta.label}</span>
              </span>
            </button>
            <span className="rounded-full bg-white/5 px-2 py-[2px] text-xs text-slate-200">{channelIcon}</span>
            <div className="relative">
              {isNextPopoverOpen ? (
                <div
                  className="absolute left-0 top-8 w-44 rounded-md border border-white/10 bg-black/90 p-2 text-[11px] text-slate-100 shadow-lg z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-white/10"
                    onClick={() => handleSetDateAndClose(today)}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-white/10"
                    onClick={() => handleSetDateAndClose(tomorrow)}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-white/10"
                    onClick={() => handleSetDateAndClose(nextWeek)}
                  >
                    Next week
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1 text-left text-slate-300 hover:bg-white/10"
                    onClick={() => handleSetDateAndClose(null)}
                  >
                    Clear
                  </button>
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
                    className="mt-1 w-full rounded-md border border-white/15 bg-black/60 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-slate-200">
              {ownerInitial}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400">Add tags</span>
          ) : (
            tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                {tag}
              </span>
            ))
          )}
          {project.mqaScore ? (
            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-100">
              MQA {project.mqaScore}
            </span>
          ) : null}
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
    // TODO: Add keyboard up/down navigation for Today list
    // TODO: Focus first item automatically for keyboard workflows

    return (
      <div className="w-full flex flex-col items-center mt-4">
        <div className="w-full max-w-2xl px-4 space-y-2">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Today</h2>
            <p className="text-sm text-slate-400">Overdue + due today accounts, sorted by priority.</p>
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
            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-[#0F1012] px-4 py-6 text-sm text-slate-400">
                Nothing due today. Add next touches or open a card to plan work.
              </div>
            ) : null}
          </div>
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
    {
      key: "hotOnly" as const,
      label: "Hot",
      description: "ICP > 80",
    },
    {
      key: "missingNext" as const,
      label: "Missing next",
      description: "No next touch",
    },
    {
      key: "overdueOnly" as const,
      label: "Overdue",
      description: "Needs action",
    },
  ];

  return (
    <div className="space-y-4">
      <Toast message={message} onClear={() => setMessage(null)} />
      <Toast message={error} type="error" onClear={() => setError(null)} />

      <div className="space-y-3 rounded-2xl border border-[#1D2024] bg-[#0C0D0F] p-4 shadow-inner shadow-black/30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{mode === "today" ? "Today mode" : "Pipeline"}</span>
          </div>
          <p className="text-sm text-slate-300">
            {mode === "today"
              ? "Accounts that need a touch today or are overdue."
              : "Minimal, scannable lanes focused on next actions."}
          </p>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setMode("board")}
              className={`rounded-full px-3 py-1 text-sm transition ${
                mode === "board" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => setMode("today")}
              className={`rounded-full px-3 py-1 text-sm transition ${
                mode === "today" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Today
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, [pill.key]: !f[pill.key] }))}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-left text-[12px] transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                filters[pill.key] ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-200"
              }`}
            >
              <span className="text-[11px] text-slate-400">{pill.description}</span>
              <span className="font-semibold">{pill.label}</span>
            </button>
          ))}
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setFilters({ hotOnly: false, missingNext: false, overdueOnly: false });
                setSearchTerm("");
                setSortMode("next");
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[12px] text-slate-200 transition hover:border-emerald-300 hover:text-white"
            >
              Reset view
            </button>
          ) : null}
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
          <div className="flex items-center justify-end gap-2 text-[12px] text-slate-300">
            <span className="text-slate-400">Sort</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "next" | "icp")}
              className="rounded-md border border-[#2D3136] bg-[#0F1012] px-2 py-1 text-[12px] text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="next">Next touch</option>
              <option value="icp">ICP</option>
            </select>
          </div>
        </div>
      </div>

      {mode === "board" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {grouped.map((column) => {
            const stats = laneSnapshot(column.items);
            const subtitle = helperByStatus[column.status] || column.status.replace(/_/g, " ");

            return (
              <div
                key={column.status}
                className={`relative min-h-[360px] overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur transition ${
                  draggingId ? "ring-1 ring-emerald-500/40" : ""
                } ${hoveredStatus === column.status ? "ring-1 ring-emerald-400/40" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setHoveredStatus(column.status)}
                onDragLeave={() => setHoveredStatus(null)}
                onDrop={() => {
                  onDrop(column.status);
                  setHoveredStatus(null);
                }}
              >
                <div className={`absolute left-0 top-0 h-[2px] w-full ${statusTopBorder[column.status]}`} />
                <div className="mb-2 space-y-1 leading-tight">
                  <h2 className="text-sm font-semibold tracking-wide">
                    {column.status.replace(/_/g, " ")} ({column.items.length})
                  </h2>
                  <p className="text-xs text-gray-400 whitespace-nowrap leading-tight">
                    {subtitle} · Hot {stats.hot} · Missing {stats.missingNext} · Overdue {stats.overdue}
                  </p>
                  <p className="text-xs text-gray-500 whitespace-nowrap leading-tight">Focus: Clear accounts with &quot;Not set&quot;</p>
                </div>

                <div className="space-y-3">
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
                  {column.items.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-zinc-800/80 bg-zinc-900/50 text-xs italic text-zinc-700">
                      No accounts here yet.
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          <TodayView projects={todayProjects} onChangeNextTouch={handleNextTouchChange} />
        )}

      {selectedProject ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedProject(null)} />
          <div className="relative h-full w-full max-w-[420px] border-l border-white/10 bg-[#0B0C0F] px-5 py-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-white">{deriveName(selectedProject.name, selectedProject.url)}</p>
                <p className="text-[12px] text-slate-400">{deriveDomain(selectedProject.url)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="rounded-full border border-white/10 px-2 py-1 text-sm text-slate-200 hover:border-emerald-300 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-white/10 bg-[#0F1114] p-3 text-sm text-slate-200">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">
                  {selectedProject.status.replace(/_/g, " ")}
                </span>
                <span className="rounded-full bg-white/5 px-2 py-1">ICP {selectedProject.icpScore ?? "-"}</span>
                <span className="rounded-full bg-white/5 px-2 py-1">MQA {selectedProject.mqaScore ?? "-"}</span>
                {selectedProject.hasOverdueSequenceStep ? (
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-[11px] text-red-200">Overdue</span>
                ) : null}
              </div>
              <div className="flex items-center justify-between text-[12px] text-slate-200">
                <div className={`flex items-center gap-2 ${urgencyLabel(selectedProject.nextSequenceStepDueAt || undefined).color}`}>
                  <span className="text-slate-400">Next touch:</span>
                  <span className="font-medium">
                    {urgencyLabel(selectedProject.nextSequenceStepDueAt || undefined).label}
                  </span>
                  {selectedProject.nextSequenceStepDueAt ? (
                    <span className="text-[11px] text-slate-500">{formatDate(selectedProject.nextSequenceStepDueAt)}</span>
                  ) : null}
                </div>
                <Link
                  href={`/projects/${selectedProject.id}/workspace`}
                  className="rounded-full border border-emerald-400/40 px-3 py-1 text-[12px] text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/10"
                >
                  Open workspace
                </Link>
              </div>
              <div className="space-y-2 text-[13px] text-slate-300">
                <p className="text-[12px] uppercase tracking-wide text-slate-500">Overview</p>
                <p>{selectedProject.summary || selectedProject.playbookSummary || "Add a summary in the workspace."}</p>
                <div className="flex flex-wrap gap-2">
                  {deriveTags(selectedProject.categoryTags).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
                {selectedProject.url ? (
                  <Link href={selectedProject.url} className="text-[12px] text-emerald-200 underline-offset-2 hover:underline">
                    {selectedProject.url}
                  </Link>
                ) : null}
              </div>
              <div className="space-y-2 text-[13px] text-slate-300">
                <p className="text-[12px] uppercase tracking-wide text-slate-500">Stage</p>
                <StatusSelect
                  projectId={selectedProject.id}
                  status={selectedProject.status}
                  onChange={(next) => {
                    handleStatusChange(selectedProject.id, next);
                    setSelectedProject((prev) => (prev ? { ...prev, status: next } : prev));
                  }}
                />
              </div>
              <p className="text-[12px] text-slate-500">
                Use the workspace to log touches, set next dates, or update contacts. This panel keeps context without leaving the board.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
