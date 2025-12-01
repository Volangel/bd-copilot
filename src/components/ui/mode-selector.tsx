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
    <div className="flex gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)]/60 p-2 shadow-inner shadow-black/20">
      {modes.map((m) => {
        const isActive = m.mode === active;
        return (
          <Link
            key={m.mode}
            href={modeDefaults[m.mode]}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              isActive
                ? "bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-[0_0_20px_rgba(0,217,163,0.35)]"
                : "bg-[var(--bg-secondary)]/70 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
            )}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
