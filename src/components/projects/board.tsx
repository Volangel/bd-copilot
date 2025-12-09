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

type NextTouchMeta = { label: string; color: string; pill: string };

type LeadCardProps = {
  project: BoardProject;
  name: string;
  domain: string;
  tags: string[];
  urgency: NextTouchMeta;
  dragging: boolean;
  onDragStart?: () => void;
  onSelect: () => void;
  showStatus?: boolean;
  onStatusChange?: (status: string) => void;
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

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#111216] text-[10px] font-semibold uppercase text-white">
      {initials}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[4px] bg-white/5 px-2 py-[3px] text-[11px] text-slate-200">
      <span>{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </span>
  );
}

function LaneFocusBar({ label }: { label: string }) {
  return <div className="mb-2 px-2 py-1 text-[11px] text-slate-300">Focus: {label}</div>;
}

function LeadCard({
  project,
  name,
  domain,
  tags,
  urgency,
  dragging,
  onDragStart,
  onSelect,
  showStatus = true,
  onStatusChange,
}: LeadCardProps) {
  const nextDescriptor =
    urgency.label === "Overdue"
      ? "Next: Overdue"
      : urgency.label === "Today"
        ? "Next: Today"
        : urgency.label === "Not set"
          ? "Next: Not set"
          : "Next: Upcoming";
  const nextColor =
    urgency.label === "Overdue"
      ? "text-red-400"
      : urgency.label === "Today"
        ? "text-emerald-400"
        : urgency.label === "Not set"
          ? "text-slate-400"
          : "text-amber-300";
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
      className={`group relative overflow-hidden rounded-[4px] border border-white/5 bg-[#0F1114] p-2 text-left transition-all duration-150 hover:-translate-y-[1px] hover:border-emerald-500/40 ${
        dragging ? "ring-2 ring-emerald-400/60" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Avatar initials={name.slice(0, 2).toUpperCase()} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{name}</p>
          <p className="truncate text-[11px] text-slate-400">{domain || "No domain"}</p>
        </div>
        {showStatus ? (
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <StatusSelect
              projectId={project.id}
              status={project.status}
              onChange={(next) => onStatusChange?.(next)}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-1 text-slate-200">
          <span className="rounded-[4px] bg-white/5 px-2 py-[3px]">ICP {project.icpScore ?? "–"}</span>
          <span className="rounded-[4px] bg-white/5 px-2 py-[3px]">MQA {project.mqaScore ?? "–"}</span>
          {tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-[4px] bg-white/5 px-2 py-[3px] text-slate-200">
              {tag}
            </span>
          ))}
        </div>
        <div className={`whitespace-nowrap text-[12px] font-semibold ${nextColor}`}>
          {nextDescriptor}
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
  const [mode, setMode] = useState<"board" | "focus">("board");
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

  const urgencyLabel = (nextSequenceStepDueAt?: Date | null): NextTouchMeta => {
    if (!nextSequenceStepDueAt) return { label: "Not set", color: "text-slate-400", pill: "bg-slate-700/30" };
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    if (nextSequenceStepDueAt < startOfToday) return { label: "Overdue", color: "text-red-300", pill: "bg-red-500/10" };
    if (nextSequenceStepDueAt >= startOfToday && nextSequenceStepDueAt < endOfToday)
      return { label: "Today", color: "text-emerald-300", pill: "bg-emerald-500/10" };
    const diffDays = Math.round((nextSequenceStepDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const label = diffDays <= 7 ? `In ${diffDays}d` : "Upcoming";
    return { label, color: "text-amber-200", pill: "bg-amber-500/10" };
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

  const focusList = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const candidates = filteredProjects.filter((p) => {
      if (!p.nextSequenceStepDueAt) return p.hasOverdueSequenceStep;
      return p.nextSequenceStepDueAt < endOfToday;
    });

    const urgencyRank = (project: BoardProject) => {
      if (project.hasOverdueSequenceStep) return 0;
      if (!project.nextSequenceStepDueAt) return 2;
      const due = project.nextSequenceStepDueAt;
      if (due < startOfToday) return 0;
      if (due < endOfToday) return 1;
      return 2;
    };

    return [...candidates].sort((a, b) => {
      const urgencyDiff = urgencyRank(a) - urgencyRank(b);
      if (urgencyDiff !== 0) return urgencyDiff;
      const icpDiff = (b.icpScore ?? 0) - (a.icpScore ?? 0);
      if (icpDiff !== 0) return icpDiff;
      return (b.mqaScore ?? 0) - (a.mqaScore ?? 0);
    });
  }, [filteredProjects]);

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
            <span>{mode === "focus" ? "Today mode" : "Pipeline"}</span>
          </div>
          <p className="text-sm text-slate-300">
            {mode === "focus"
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
              onClick={() => setMode("focus")}
              className={`rounded-full px-3 py-1 text-sm transition ${
                mode === "focus" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
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

      {mode === "focus" ? (
        <div className="space-y-3 rounded-2xl border border-[#1C1F23] bg-[#0D0E10] p-4 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">Today / Focus mode</p>
              <p className="text-[12px] text-slate-400">Overdue first, then highest-fit accounts.</p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-[12px] text-slate-200">{focusList.length} accounts</span>
          </div>
          <div className="space-y-3">
            {focusList.map((project) => {
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
                  onSelect={() => setSelectedProject(project)}
                  showStatus={false}
                />
              );
            })}
            {focusList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-[#0F1012] px-4 py-6 text-sm text-slate-400">
                Nothing due today. Add next touches or open a card to plan work.
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {grouped.map((column) => {
            const stats = laneSnapshot(column.items);
            const laneFocus = priorityPick(column.items);
            const laneFocusName = laneFocus ? deriveName(laneFocus.name, laneFocus.url) : null;
            const laneFocusUrgency = laneFocus ? urgencyLabel(laneFocus.nextSequenceStepDueAt || undefined) : null;

            return (
              <div
                key={column.status}
                className={`relative min-h-[360px] overflow-hidden rounded-[4px] border border-white/5 bg-[#0D0E10] px-2.5 py-3 transition ${
                  draggingId ? "ring-1 ring-emerald-500/30" : ""
                } ${hoveredStatus === column.status ? "border-emerald-400/50" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setHoveredStatus(column.status)}
                onDragLeave={() => setHoveredStatus(null)}
                onDrop={() => {
                  onDrop(column.status);
                  setHoveredStatus(null);
                }}
              >
                <div className={`absolute left-0 top-0 h-[3px] w-full ${statusTopBorder[column.status]}`} />
                <div className="mb-2.5 space-y-1.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm font-semibold text-white">
                      <span>{column.status.replace(/_/g, " ")}</span>
                      <span className="rounded-[4px] bg-white/5 px-2 py-[3px] text-[11px] text-slate-200">{column.items.length}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{helperByStatus[column.status] || ""}</p>
                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
                      <StatChip label="Hot" value={stats.hot} />
                      <span className="text-slate-600">•</span>
                      <StatChip label="Missing" value={stats.missingNext} />
                      <span className="text-slate-600">•</span>
                      <StatChip label="Overdue" value={stats.overdue} />
                    </div>
                  </div>
                  {laneFocus ? (
                    <LaneFocusBar
                      label={`${laneFocusName || ""}${laneFocusUrgency ? ` • ${laneFocusUrgency.label}` : ""} • Clear these first`}
                    />
                  ) : null}
                </div>

                <div className="space-y-2.5">
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
                        onSelect={() => setSelectedProject(project)}
                        showStatus
                        onStatusChange={(next) => handleStatusChange(project.id, next)}
                      />
                    );
                  })}
                  {column.items.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-[4px] border border-dashed border-[#232527] bg-[#111214] text-xs text-slate-500">
                      No accounts here yet.
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
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
