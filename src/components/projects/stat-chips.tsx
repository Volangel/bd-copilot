"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type StatChip = {
  id: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  href: string;
  isAlert?: boolean;
};

type StatChipsProps = {
  total: number;
  overdue: number;
  dueToday: number;
  highIcp: number;
  needsAction: number;
};

export function StatChips({ total, overdue, dueToday, highIcp, needsAction }: StatChipsProps) {
  const searchParams = useSearchParams();

  const chips: StatChip[] = [
    {
      id: "total",
      label: "Total",
      value: total,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: "text-slate-300",
      bgColor: "bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/20",
      href: "/projects",
    },
    {
      id: "overdue",
      label: "Overdue",
      value: overdue,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-red-400",
      bgColor: "bg-red-500/10 hover:bg-red-500/20 border-red-500/20",
      href: "/projects?overdue=true",
      isAlert: overdue > 0,
    },
    {
      id: "today",
      label: "Due Today",
      value: dueToday,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
      href: "/projects?today=true",
      isAlert: dueToday > 0,
    },
    {
      id: "high-icp",
      label: "High ICP",
      value: highIcp,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20",
      href: "/projects?minICP=70",
    },
    {
      id: "needs-action",
      label: "Needs Action",
      value: needsAction,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "text-purple-400",
      bgColor: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
      href: "/projects?status=NOT_CONTACTED,WAITING_REPLY",
    },
  ];

  // Determine active chip based on current URL params
  const getActiveChip = () => {
    const params = searchParams.toString();
    if (!params) return "total";
    if (params.includes("overdue=true")) return "overdue";
    if (params.includes("today=true")) return "today";
    if (params.includes("minICP=70")) return "high-icp";
    if (params.includes("status=NOT_CONTACTED,WAITING_REPLY")) return "needs-action";
    return null;
  };

  const activeChip = getActiveChip();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => {
        const isActive = activeChip === chip.id;
        return (
          <Link
            key={chip.id}
            href={chip.href}
            className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              isActive
                ? `${chip.bgColor} ring-1 ring-white/20`
                : `border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white`
            } ${chip.isAlert ? "animate-pulse-subtle" : ""}`}
          >
            <span className={isActive ? chip.color : ""}>{chip.icon}</span>
            <span className={isActive ? chip.color : ""}>{chip.label}</span>
            <span className={`font-bold ${isActive ? chip.color : "text-white"}`}>{chip.value}</span>

            {/* Alert indicator for overdue/today */}
            {chip.isAlert && chip.value > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  chip.id === "overdue" ? "bg-red-400" : "bg-amber-400"
                }`} />
                <span className={`relative inline-flex h-3 w-3 rounded-full ${
                  chip.id === "overdue" ? "bg-red-500" : "bg-amber-500"
                }`} />
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
