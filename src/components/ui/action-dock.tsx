"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const actions = [
  { label: "Command", helper: "⌘/Ctrl + K", tone: "primary" as const, onClick: () => openCommandPalette() },
  { label: "Session", helper: "Deep focus", href: "/session" },
  { label: "Quick Capture", helper: "Drop notes", href: "/tools/quick-capture" },
  { label: "Add Project", helper: "Zero friction", href: "/projects" },
];

function openCommandPalette() {
  document.dispatchEvent(new CustomEvent("open-command-palette"));
}

export function ActionDock() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 hidden md:flex">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-[var(--bg-secondary)]/90 px-3 py-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
        {actions.map((action) => {
          const isActive = action.href ? pathname?.startsWith(action.href) : false;
          const sharedClasses =
            "group relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]";

          if (action.onClick) {
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`${sharedClasses} border border-emerald-400/60 bg-emerald-500/15 text-emerald-50 hover:border-emerald-300 hover:bg-emerald-500/30`}
              >
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-emerald-100">{action.helper}</span>
                {action.label}
                <span className="absolute -bottom-8 left-1/2 hidden -translate-x-1/2 rounded-full bg-[var(--bg-tertiary)] px-3 py-1 text-[10px] font-medium text-[var(--text-tertiary)] shadow-lg shadow-black/30 group-hover:inline-block">
                  Launch command palette
                </span>
              </button>
            );
          }

          return (
            <Link
              key={action.label}
              href={action.href ?? "#"}
              className={`${sharedClasses} border ${
                isActive ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20 hover:text-white"
              }`}
            >
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-[var(--text-tertiary)]">{action.helper}</span>
              {action.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default ActionDock;
