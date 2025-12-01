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

export function ModeSelector() {
  const pathname = usePathname();
  const active = getModeForPath(pathname || "");
  const modes: { label: string; mode: AppMode }[] = [
    { label: "Discover", mode: "discover" },
    { label: "Pipeline", mode: "pipeline" },
    { label: "Execute", mode: "execute" },
  ];

  return (
    <div className="flex gap-2 rounded-lg bg-slate-900/70 p-2">
      {modes.map((m) => {
        const isActive = m.mode === active;
        return (
          <Link
            key={m.mode}
            href={modeDefaults[m.mode]}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              isActive ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700",
            )}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
