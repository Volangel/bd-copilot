"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeBadge } from "./mode-badge";
import { cn } from "./utils";

export type AppMode = "discover" | "pipeline" | "execute" | "other";

export type NavGroup = {
  label: string;
  mode: AppMode;
  items: { href: string; label: string }[];
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
      className={cn("space-y-6 text-sm text-[var(--text-secondary)]", className)}
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
                  "group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition",
                  "hover:-translate-y-[1px] hover:border-white/10 hover:bg-white/5 hover:text-[var(--text-primary)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-0",
                  isActivePath(item.href)
                    ? "border-white/10 bg-white/5 text-[var(--text-primary)] shadow-[0_15px_40px_rgba(0,0,0,0.25)]"
                    : "text-[var(--text-secondary)]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-8 w-1 rounded-full transition-all duration-200",
                    isActivePath(item.href)
                      ? "bg-[var(--accent-primary)] shadow-[0_0_0_3px_rgba(0,217,163,0.2)]"
                      : "bg-white/10 opacity-0 group-hover:opacity-60",
                  )}
                />
                <span className="flex-1 text-sm font-medium leading-tight">{item.label}</span>
                <svg
                  aria-hidden
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 text-[var(--text-tertiary)]",
                    isActivePath(item.href) ? "translate-x-0 text-[var(--accent-primary)]" : "translate-x-[-2px]",
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
