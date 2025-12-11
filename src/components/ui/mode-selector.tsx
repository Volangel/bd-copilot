"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./utils";
import type { AppMode } from "./sidebar-nav";

const modeDefaults: Record<AppMode, string> = {
  discover: "/radar",
  pipeline: "/projects",
  execute: "/session",
  other: "/today",
};

function getModeForPath(pathname: string): AppMode {
  if (
    pathname.startsWith("/radar") ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/discover") ||
    pathname.startsWith("/settings/watchlist")
  ) {
    return "discover";
  }
  if (pathname.startsWith("/projects")) return "pipeline";
  if (pathname.startsWith("/session") || pathname.startsWith("/tools/quick-capture")) return "execute";
  return "other";
}

const modeColors: Record<AppMode, { active: string; inactive: string }> = {
  discover: {
    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    inactive: "text-emerald-400/60 hover:text-emerald-300",
  },
  pipeline: {
    active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    inactive: "text-blue-400/60 hover:text-blue-300",
  },
  execute: {
    active: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    inactive: "text-purple-400/60 hover:text-purple-300",
  },
  other: {
    active: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    inactive: "text-slate-400/60 hover:text-slate-300",
  },
};

export function ModeSelector() {
  const pathname = usePathname();
  const active = getModeForPath(pathname || "");
  const modes: { label: string; mode: AppMode }[] = [
    { label: "Discover", mode: "discover" },
    { label: "Pipeline", mode: "pipeline" },
    { label: "Execute", mode: "execute" },
  ];

  return (
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/3 p-1">
      {modes.map((m) => {
        const isActive = m.mode === active;
        const colors = modeColors[m.mode];
        return (
          <Link
            key={m.mode}
            href={modeDefaults[m.mode]}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-center text-[11px] font-semibold transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]",
              isActive
                ? cn("border", colors.active)
                : cn("border border-transparent hover:bg-white/5", colors.inactive),
            )}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
