"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { cn } from "./utils";

export type AppMode = "discover" | "pipeline" | "execute" | "other";

export type NavItem = {
  href: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  shortcut?: string;
};

export type NavGroup = {
  label: string;
  mode: AppMode;
  items: NavItem[];
  defaultCollapsed?: boolean;
};

// Icons as simple SVG components
export const Icons = {
  today: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2.5" strokeLinecap="round" />
    </svg>
  ),
  radar: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3" />
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2" strokeLinecap="round" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M9 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="3" width="14" height="14" rx="2" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M3 7V4a1 1 0 011-1h3M13 3h3a1 1 0 011 1v3M17 13v3a1 1 0 01-1 1h-3M7 17H4a1 1 0 01-1-1v-3" strokeLinecap="round" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  ),
  watchlist: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M10 4C5.5 4 2 10 2 10s3.5 6 8 6 8-6 8-6-3.5-6-8-6z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  ),
  accounts: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <path d="M3 8h14" />
      <path d="M7 12h2M7 14h4" strokeLinecap="round" />
    </svg>
  ),
  board: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <rect x="3" y="3" width="4" height="14" rx="1" />
      <rect x="8" y="3" width="4" height="9" rx="1" />
      <rect x="13" y="3" width="4" height="11" rx="1" />
    </svg>
  ),
  import: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M10 3v10M6 9l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" strokeLinecap="round" />
    </svg>
  ),
  session: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <polygon points="6,3 17,10 6,17" />
    </svg>
  ),
  capture: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M12 3H8a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V8l-5-5z" />
      <path d="M12 3v5h5" />
      <path d="M10 11v3M8.5 12.5L10 14l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  playbooks: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M7 7h6M7 10h6M7 13h4" strokeLinecap="round" />
    </svg>
  ),
  templates: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M3 7h14M7 7v10" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 3v1.5M10 15.5V17M17 10h-1.5M4.5 10H3M14.95 5.05l-1.06 1.06M6.11 13.89l-1.06 1.06M14.95 14.95l-1.06-1.06M6.11 6.11L5.05 5.05" strokeLinecap="round" />
    </svg>
  ),
  billing: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <rect x="2" y="4" width="16" height="12" rx="2" />
      <path d="M2 8h16" />
      <path d="M6 12h3" strokeLinecap="round" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
      <path d="M5 7l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const STORAGE_KEY = "sidebar-collapsed-sections";

function useCollapsedSections(groups: NavGroup[]) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCollapsed(JSON.parse(stored));
      } else {
        // Set defaults from group config
        const defaults: Record<string, boolean> = {};
        groups.forEach((g) => {
          if (g.defaultCollapsed) defaults[g.label] = true;
        });
        setCollapsed(defaults);
      }
    } catch {
      // Ignore localStorage errors
    }
    setHydrated(true);
  }, [groups]);

  const toggle = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

  return { collapsed, toggle, hydrated };
}

interface SidebarNavProps {
  groups: NavGroup[];
  className?: string;
  compact?: boolean;
}

export function SidebarNav({ groups, className, compact = true }: SidebarNavProps) {
  const pathname = usePathname();
  const { collapsed, toggle, hydrated } = useCollapsedSections(groups);

  const isActivePath = (href: string) => {
    if (!pathname) return false;
    if (href === "/" && pathname === "/") return true;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Find if any item in a group is active
  const hasActiveItem = (group: NavGroup) => {
    return group.items.some((item) => isActivePath(item.href));
  };

  return (
    <nav
      aria-label="Primary navigation"
      className={cn("space-y-1 text-sm", className)}
    >
      {groups.map((group) => {
        const isCollapsed = hydrated ? collapsed[group.label] : false;
        const groupHasActive = hasActiveItem(group);

        return (
          <div key={group.label} className="py-1">
            {/* Section Header - Clickable to collapse */}
            <button
              type="button"
              onClick={() => toggle(group.label)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                "hover:bg-white/5",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]",
              )}
              aria-expanded={!isCollapsed}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.15em]",
                  groupHasActive ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]",
                )}
              >
                {group.label}
              </span>
              <span
                className={cn(
                  "text-[var(--text-tertiary)] transition-transform duration-200",
                  isCollapsed ? "-rotate-90" : "rotate-0",
                )}
              >
                {Icons.chevronDown}
              </span>
            </button>

            {/* Section Items */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100",
              )}
            >
              <div className="mt-1 space-y-0.5 pl-1">
                {group.items.map((item) => (
                  <NavItemLink
                    key={`${group.label}-${item.href}`}
                    item={item}
                    isActive={isActivePath(item.href)}
                    compact={compact}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

interface NavItemLinkProps {
  item: NavItem;
  isActive: boolean;
  compact: boolean;
}

function NavItemLink({ item, isActive, compact }: NavItemLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <Link
        href={item.href}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-2 py-2 transition-all duration-150",
          "hover:bg-white/5",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]",
          isActive
            ? "bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
        aria-current={isActive ? "page" : undefined}
      >
        {/* Active indicator bar */}
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-all duration-150",
            isActive
              ? "bg-[var(--accent-primary)] opacity-100"
              : "bg-transparent opacity-0",
          )}
        />

        {/* Icon */}
        <span
          className={cn(
            "flex-shrink-0 transition-colors",
            isActive
              ? "text-[var(--accent-primary)]"
              : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]",
          )}
        >
          {item.icon}
        </span>

        {/* Label */}
        <span className="flex-1 truncate text-[13px] font-medium leading-tight">
          {item.label}
        </span>

        {/* Badge */}
        {item.badge && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
              item.badge.toLowerCase() === "live"
                ? "bg-emerald-500/20 text-emerald-300"
                : item.badge.toLowerCase() === "beta"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-white/10 text-[var(--text-tertiary)]",
            )}
          >
            {item.badge}
          </span>
        )}

        {/* Keyboard shortcut hint */}
        {item.shortcut && (
          <span className="hidden text-[10px] text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 lg:block">
            {item.shortcut}
          </span>
        )}
      </Link>

      {/* Hover tooltip with description (only in compact mode) */}
      {compact && item.description && showTooltip && (
        <div
          className={cn(
            "pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2",
            "w-48 rounded-lg border border-white/10 bg-[var(--bg-elevated)] px-3 py-2 shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-150",
          )}
        >
          <p className="text-xs font-medium text-[var(--text-primary)]">{item.label}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-tertiary)]">
            {item.description}
          </p>
        </div>
      )}
    </div>
  );
}

// Today Hero Section - Special pinned item at top
export function TodayHero({ href, isActive }: { href: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-150",
        "hover:border-white/15 hover:bg-white/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
        isActive
          ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/8"
          : "border-white/8 bg-white/3",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          isActive
            ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
            : "bg-white/8 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]",
        )}
      >
        {Icons.today}
      </div>
      <div className="flex-1">
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
          )}
        >
          Today
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)]">Your daily overview</p>
      </div>
      <span
        className={cn(
          "text-[10px] font-medium",
          isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)]",
        )}
      >
        ⌘T
      </span>
    </Link>
  );
}

// Quick command trigger
export function QuickCommandTrigger({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border border-white/8 bg-white/3 px-3 py-2 transition-all",
        "hover:border-white/15 hover:bg-white/5",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]",
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-4 w-4 text-[var(--text-tertiary)]"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="M12.5 12.5L17 17" strokeLinecap="round" />
      </svg>
      <span className="flex-1 text-left text-[13px] text-[var(--text-tertiary)]">
        Search or jump to...
      </span>
      <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
        ⌘K
      </span>
    </button>
  );
}
