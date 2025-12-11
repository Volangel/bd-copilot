"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/components/ui/utils";

interface QuickAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "warning";
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < lastScrollY || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + number shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= actions.length) {
          e.preventDefault();
          actions[num - 1]?.onClick();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);

  const variantStyles = {
    default: "bg-slate-800/80 text-slate-200 hover:bg-slate-700 border-slate-700",
    primary: "bg-emerald-600/80 text-white hover:bg-emerald-500 border-emerald-500",
    warning: "bg-amber-600/80 text-white hover:bg-amber-500 border-amber-500",
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
        className,
      )}
    >
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "group relative flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              variantStyles[action.variant || "default"],
            )}
          >
            <span className="text-current opacity-70">{action.icon}</span>
            <span>{action.label}</span>
            {action.shortcut && (
              <kbd className="ml-1 hidden rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-medium opacity-60 md:inline-block">
                {action.shortcut}
              </kbd>
            )}
            {/* Tooltip with shortcut */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap pointer-events-none">
              {action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Smaller inline action bar for sections
export function InlineActions({
  actions,
  className,
}: {
  actions: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "primary" | "ghost";
  }>;
  className?: string;
}) {
  const variantStyles = {
    default: "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border-white/10",
    primary: "bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-500",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5 border-transparent",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
            variantStyles[action.variant || "default"],
          )}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
