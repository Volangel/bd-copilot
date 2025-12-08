"use client";

import { cn } from "./utils";

export function OpenCommandPaletteButton({ className }: { className?: string }) {
  const handleClick = () => {
    document.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition hover:border-[var(--accent-primary)]/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]",
        className,
      )}
    >
      <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-[var(--text-tertiary)]">⌘K</span>
      Command palette
    </button>
  );
}

export default OpenCommandPaletteButton;
