"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

type Project = {
  id: string;
  name: string | null | undefined;
  url: string;
  status: string;
  icpScore: number | null | undefined;
  mqaScore: number | null | undefined;
  updatedAt: Date;
  nextSequenceStepDueAt: Date | null;
  hasOverdueSequenceStep: boolean;
  overdueCount: number;
};

type ProjectsTableProps = {
  projects: Project[];
  sequenceMap: Record<string, number>;
};

export function ProjectsTable({ projects, sequenceMap }: ProjectsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Project>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map((p) => p.id)));
    }
  };

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1012] shadow-lg shadow-black/20 overflow-hidden">
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b border-white/10 bg-emerald-500/10 px-4 py-2">
          <span className="text-sm text-emerald-300">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5">
              Change Status
            </button>
            <button className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10">
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === projects.length && projects.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-500 focus:ring-emerald-500/20"
                />
              </th>
              <th className="px-4 py-3">
                <SortButton field="name" current={sortField} dir={sortDir} onClick={() => handleSort("name")}>
                  Account
                </SortButton>
              </th>
              <th className="px-4 py-3 text-center">
                <SortButton field="icpScore" current={sortField} dir={sortDir} onClick={() => handleSort("icpScore")}>
                  ICP
                </SortButton>
              </th>
              <th className="px-4 py-3">
                <SortButton field="status" current={sortField} dir={sortDir} onClick={() => handleSort("status")}>
                  Status
                </SortButton>
              </th>
              <th className="px-4 py-3">Next Touch</th>
              <th className="px-4 py-3">
                <SortButton field="updatedAt" current={sortField} dir={sortDir} onClick={() => handleSort("updatedAt")}>
                  Updated
                </SortButton>
              </th>
              <th className="w-24 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                sequenceCount={sequenceMap[project.id] || 0}
                isSelected={selectedIds.has(project.id)}
                onToggleSelect={() => toggleSelect(project.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {projects.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300">No accounts found</p>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your filters or add a new account</p>
        </div>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  sequenceCount,
  isSelected,
  onToggleSelect,
}: {
  project: Project;
  sequenceCount: number;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);
  const displayName = project.name || getDomainFromUrl(project.url);
  const priorityLevel = getPriorityLevel(project);

  return (
    <tr
      className={`group transition ${isSelected ? "bg-emerald-500/5" : "hover:bg-white/[0.02]"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-500 focus:ring-emerald-500/20"
        />
      </td>

      {/* Account */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Priority indicator */}
          <div className={`h-10 w-1 rounded-full ${priorityLevel.color}`} />

          {/* Avatar/Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5 text-sm font-bold text-slate-400">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <Link
              href={`/projects/${project.id}/workspace`}
              className="block truncate font-medium text-white transition hover:text-emerald-300"
            >
              {displayName}
            </Link>
            <p className="truncate text-xs text-slate-500">{project.url}</p>

            {/* Inline badges */}
            <div className="mt-1 flex flex-wrap gap-1">
              {sequenceCount > 0 && (
                <span className="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                  {sequenceCount} seq
                </span>
              )}
              {project.hasOverdueSequenceStep && (
                <span className="inline-flex items-center rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                  Overdue
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* ICP Score */}
      <td className="px-4 py-3 text-center">
        <ScoreBadge score={project.icpScore} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={project.status} />
      </td>

      {/* Next Touch */}
      <td className="px-4 py-3">
        {project.nextSequenceStepDueAt ? (
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isOverdue(project.nextSequenceStepDueAt) ? "text-red-400" : "text-slate-300"}`}>
              {formatRelativeDate(project.nextSequenceStepDueAt)}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-600">—</span>
        )}
      </td>

      {/* Updated */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">{formatRelativeDate(project.updatedAt)}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className={`flex items-center justify-end gap-1 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}>
          <ActionButton
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            onClick={() => router.push(`/projects/${project.id}/workspace`)}
            title="Open workspace"
          />
          <ActionButton
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            onClick={() => router.push(`/session?projectId=${project.id}`)}
            title="Session mode"
            accent
          />
          <ActionButton
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            }
            onClick={() => {}}
            title="More actions"
          />
        </div>
      </td>
    </tr>
  );
}

function SortButton({
  field,
  current,
  dir,
  onClick,
  children,
}: {
  field: string;
  current: string;
  dir: "asc" | "desc";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const isActive = field === current;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 transition hover:text-white ${isActive ? "text-emerald-400" : ""}`}
    >
      {children}
      {isActive && (
        <svg className={`h-3 w-3 transition ${dir === "asc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return <span className="text-sm text-slate-600">—</span>;

  const getColor = (s: number) => {
    if (s >= 80) return "from-emerald-500 to-emerald-600 text-white";
    if (s >= 60) return "from-blue-500 to-blue-600 text-white";
    if (s >= 40) return "from-amber-500 to-amber-600 text-black";
    return "from-slate-500 to-slate-600 text-white";
  };

  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold ${getColor(score)}`}>
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    NOT_CONTACTED: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
    CONTACTED: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
    WAITING_REPLY: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
    CALL_BOOKED: { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400" },
    WON: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
    LOST: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  };

  const c = config[status] || config.NOT_CONTACTED;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${c.bg} px-2.5 py-1 text-xs font-medium ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ActionButton({
  icon,
  onClick,
  title,
  accent,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`rounded-lg p-1.5 transition ${
        accent
          ? "text-emerald-400 hover:bg-emerald-500/20"
          : "text-slate-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
    </button>
  );
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getPriorityLevel(project: Project): { level: number; color: string } {
  if (project.hasOverdueSequenceStep) return { level: 3, color: "bg-red-500" };
  if (project.status === "WAITING_REPLY") return { level: 2, color: "bg-amber-500" };
  if (project.icpScore && project.icpScore >= 80) return { level: 1, color: "bg-emerald-500" };
  return { level: 0, color: "bg-transparent" };
}

function isOverdue(date: Date | null): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function formatRelativeDate(date: Date | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return "Just now";
    return `${hours}h ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(d);
}
