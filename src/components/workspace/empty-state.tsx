"use client";

import { cn } from "@/components/ui/utils";

interface EmptyStateProps {
  type: "contacts" | "sequence" | "activity" | "notes" | "playbook" | "analysis" | "custom";
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const emptyStates: Record<
  Exclude<EmptyStateProps["type"], "custom">,
  { title: string; description: string; icon: React.ReactNode }
> = {
  contacts: {
    title: "No contacts yet",
    description: "Add decision-makers from this account to start building relationships",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  sequence: {
    title: "No sequence created",
    description: "Create a multi-touch outreach sequence to engage this contact systematically",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  activity: {
    title: "No activity recorded",
    description: "Log your interactions to track engagement and follow-up timing",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  notes: {
    title: "No notes yet",
    description: "Capture insights, meeting notes, and important context about this account",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  playbook: {
    title: "No playbook generated",
    description: "Generate a tailored playbook to identify the best personas and angles for outreach",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  analysis: {
    title: "No analysis yet",
    description: "Run an analysis to understand this account's needs, pain points, and opportunities",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
};

export function WorkspaceEmptyState({
  type,
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const config = type === "custom" ? null : emptyStates[type];
  const finalTitle = title || config?.title || "No data";
  const finalDescription = description || config?.description || "";
  const finalIcon = icon || config?.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 text-center",
        className,
      )}
    >
      {finalIcon && (
        <div className="mb-3 rounded-xl bg-slate-800/50 p-4 text-slate-500">{finalIcon}</div>
      )}
      <h4 className="text-sm font-medium text-slate-300">{finalTitle}</h4>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{finalDescription}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Inline empty state for smaller sections
export function InlineEmptyState({
  message,
  action,
  className,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-4 py-3",
        className,
      )}
    >
      <span className="text-sm text-slate-500">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
