"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeBadge } from "./mode-badge";
import { cn } from "./utils";

export type AppMode = "discover" | "pipeline" | "execute" | "other";

export type NavItem = {
  href: string;
  label: string;
  description?: string;
  badge?: string;
};

export type NavGroup = {
  label: string;
  mode: AppMode;
  items: NavItem[];
};

export function SidebarNav({ groups, className }: { groups: NavGroup[]; className?: string }) {
  const pathname = usePathname();

  const isActivePath = (href: string) => {
    if (!pathname) return false;
    if (href === "/" && pathname === "/") return true;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Primary navigation"
      className={cn(
        "space-y-6 text-sm text-[var(--text-secondary)]",
        "[&>div:last-child>div>div:last-child]:mb-0",
        className,
      )}
    >
      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              {group.label}
            </p>
            <ModeBadge mode={group.mode} />
          </div>
          <div className="space-y-1.5">
            {group.items.map((item) => (
              <Link
                key={`${group.label}-${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-white/5 px-3 py-3 transition-all duration-200",
                  "hover:-translate-y-[1px] hover:border-white/10 hover:bg-white/5 hover:text-[var(--text-primary)] hover:shadow-[0_18px_55px_rgba(0,0,0,0.35)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-0",
                  "before:pointer-events-none before:absolute before:inset-[-1px] before:-z-10 before:rounded-[18px] before:bg-gradient-to-r before:from-white/8 before:via-white/5 before:to-transparent before:opacity-0 before:transition before:duration-300",
                  isActivePath(item.href)
                    ? "border-[var(--accent-primary)]/60 bg-gradient-to-r from-[var(--accent-primary)]/10 via-[var(--bg-secondary)] to-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[0_18px_55px_rgba(0,217,163,0.15)] before:opacity-100"
                    : "text-[var(--text-secondary)]",
                )}
                aria-current={isActivePath(item.href) ? "page" : undefined}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 h-8 w-1 rounded-full transition-all duration-200",
                    isActivePath(item.href)
                      ? "bg-[var(--accent-primary)] shadow-[0_0_0_5px_rgba(0,217,163,0.18)]"
                      : "bg-white/10 opacity-40 group-hover:opacity-70",
                  )}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold leading-tight",
                        isActivePath(item.href) ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="text-[13px] leading-snug text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <svg
                  aria-hidden
                  className={cn(
                    "mt-1 h-4 w-4 transition-all duration-200 text-[var(--text-tertiary)]",
                    isActivePath(item.href)
                      ? "translate-x-0 text-[var(--accent-primary)] drop-shadow-[0_4px_14px_rgba(0,217,163,0.45)]"
                      : "translate-x-[-2px]",
                    "group-hover:translate-x-0 group-hover:text-[var(--text-primary)]",
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
