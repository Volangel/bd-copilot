"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ModeSelector } from "./mode-selector";
import {
  SidebarNav,
  TodayHero,
  QuickCommandTrigger,
  type NavGroup,
  type AppMode,
} from "./sidebar-nav";

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

  const isTodayActive = pathname === "/today";

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
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

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Menu Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        aria-label="Open navigation menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Drawer Overlay */}
      {open && (
        <div
          ref={overlayRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === overlayRef.current) setOpen(false);
          }}
          aria-modal="true"
          role="dialog"
        >
          {/* Drawer Panel */}
          <div className="flex h-full w-[280px] max-w-[85vw] flex-col bg-[var(--bg-secondary)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[var(--accent-primary)]">BD Copilot</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">AI-powered pipeline ops</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                aria-label="Close menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-4">
                {/* Quick Command */}
                <QuickCommandTrigger />

                {/* Today Hero */}
                <TodayHero href="/today" isActive={isTodayActive} />

                {/* Mode Selector */}
                <ModeSelector />

                {/* Main Navigation */}
                <SidebarNav groups={navGroups} />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-3 py-3">
              <div className="flex items-center gap-3 rounded-lg bg-white/3 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)]/20 text-xs font-semibold text-[var(--accent-primary)]">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                    {user.email}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">{user.plan || "Free"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
