"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ModeSelector } from "./mode-selector";
import { SidebarNav, type NavGroup, type AppMode } from "./sidebar-nav";
import { ModeBadge } from "./mode-badge";

export function MobileNavDrawer({
  navGroups,
  user,
}: {
  navGroups: NavGroup[];
  user: { email: string; plan?: string | null };
}) {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const currentMode: AppMode = useMemo(() => {
    if (!pathname) return "other";
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
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = requestAnimationFrame(() => overlayRef.current?.focus());
    return () => cancelAnimationFrame(timer);
  }, [open]);

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg shadow-black/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
          aria-label="Open navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden min-w-[90px] sm:flex">
          <ModeBadge mode={currentMode} />
        </div>
      </div>

      {open ? (
        <div
          ref={overlayRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur"
          onClick={(e) => {
            if (e.target === overlayRef.current) setOpen(false);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="h-full w-[min(92vw,360px)] overflow-y-auto border-l border-white/10 bg-[var(--bg-secondary)]/95 px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between gap-2 pb-4">
              <div>
                <p className="text-sm font-semibold text-[var(--accent-primary)]">Web3 BD Copilot</p>
                <p className="text-xs text-[var(--text-secondary)]">Plan: {user.plan || "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
              >
                Close
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--bg-tertiary)]/80 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{user.email}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Stay in flow</p>
                </div>
                <ModeBadge mode={currentMode} />
              </div>
              <ModeSelector />
              <SidebarNav groups={navGroups} className="pb-4" />
              <div className="rounded-xl border border-white/10 bg-[var(--bg-tertiary)]/80 px-4 py-3 text-sm text-[var(--text-secondary)]">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Workspace hint</p>
                <p className="mt-1 leading-snug">
                  You are in <span className="font-semibold text-white">{pathname}</span>. Mode badges change color so you always know
                  whether you are scanning, prioritizing, or executing.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
