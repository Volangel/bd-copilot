"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Command = { label: string; action: string; shortcut?: string };

const commands: Command[] = [
  { label: "Go to Projects", action: "/projects", shortcut: "g p" },
  { label: "Go to Board", action: "/projects/board", shortcut: "g b" },
  { label: "Go to Session", action: "/session", shortcut: "g s" },
  { label: "Go to Discovery Feed", action: "/discover", shortcut: "g d" },
  { label: "Scan Opportunities", action: "/discover/scan" },
  { label: "Go to Radar", action: "/radar", shortcut: "g r" },
  { label: "Scan Watchlist", action: "/discover/scan-watchlist" },
  { label: "Go to Watchlist", action: "/settings/watchlist" },
  { label: "Go to Playbooks", action: "/settings/playbooks" },
  { label: "Open Contact Workbench", action: "/projects", shortcut: "g c" },
  { label: "Next Sequence Step", action: "/session" },
  { label: "Go to Today", action: "/today", shortcut: "g y" },
  { label: "Go to Templates", action: "/templates", shortcut: "g t" },
  { label: "Go to Import", action: "/projects/import" },
  { label: "Go to Settings", action: "/settings" },
  { label: "Go to Quick Capture", action: "/tools/quick-capture" },
];

const goShortcuts: Record<string, string> = {
  b: "/projects/board",
  c: "/projects",
  d: "/discover",
  p: "/projects",
  r: "/radar",
  s: "/session",
  t: "/templates",
  y: "/today",
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const gPressed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return commands;
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(normalizedQuery));
  }, [query]);

  const featured = useMemo(() => commands.filter((cmd) => cmd.shortcut), []);

  // Memoize event handlers for proper cleanup and to avoid memory leaks
  const handler = useCallback((e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }, []);

  const comboHandler = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    if (key === "g") {
      gPressed.current = true;
      const timerId = window.setTimeout(() => {
        gPressed.current = false;
      }, 800);
      // Store timeout ID for potential cleanup
      return () => clearTimeout(timerId);
    }

    if (!gPressed.current) return;

    const destination = goShortcuts[key];
    if (destination) {
      e.preventDefault();
      router.push(destination);
    }
    gPressed.current = false;
  }, [router]);

  const openEventHandler = useCallback(() => setOpen(true), []);
  const closeEventHandler = useCallback(() => setOpen(false), []);

  useEffect(() => {
    window.addEventListener("keydown", handler);
    window.addEventListener("keydown", comboHandler);
    document.addEventListener("open-command-palette", openEventHandler);
    document.addEventListener("close-command-palette", closeEventHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keydown", comboHandler);
      document.removeEventListener("open-command-palette", openEventHandler);
      document.removeEventListener("close-command-palette", closeEventHandler);
    };
  }, [handler, comboHandler, openEventHandler, closeEventHandler]);

  const activate = (action: string) => {
    router.push(action);
    setOpen(false);
    setQuery("");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 backdrop-blur"
      ref={containerRef}
      onMouseDown={(event) => {
        if (event.target === containerRef.current) {
          setOpen(false);
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[var(--bg-secondary)]/95 p-5 shadow-[0_32px_120px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-3 border-b border-white/5 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">Command palette</p>
            <p className="text-lg font-semibold text-white">Navigate faster with global actions</p>
            <p className="text-sm text-[var(--text-tertiary)]">Type to filter or use the Go shortcuts (g + key).</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
            <kbd className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white">⌘ / Ctrl</kbd>
            <span className="opacity-60">+</span>
            <kbd className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white">K</kbd>
            <span className="text-[var(--text-disabled)]">Toggle</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command, destination, or action..."
              className="w-full rounded-xl border border-white/10 bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-white shadow-inner shadow-black/30 focus:border-[var(--accent-primary)] focus:outline-none"
            />
            <div className="mt-3 max-h-72 space-y-1 overflow-auto pr-1">
              {filtered.map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={() => activate(cmd.action)}
                  className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-sm text-slate-200 transition hover:border-white/10 hover:bg-white/5"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" aria-hidden />
                    {cmd.label}
                  </span>
                  {cmd.shortcut ? (
                    <span className="text-[11px] text-[var(--text-tertiary)]">{cmd.shortcut}</span>
                  ) : null}
                </button>
              ))}
              {filtered.length === 0 ? <p className="px-2 py-4 text-xs text-[var(--text-tertiary)]">No commands match your search.</p> : null}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
              <span>Use Esc or click outside to close</span>
              <span>Navigate instantly: type scan, board, playbook ...</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-3 shadow-inner shadow-black/30">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white">Featured shortcuts</p>
            <div className="flex flex-wrap gap-2">
              {featured.map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={() => activate(cmd.action)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:border-[var(--accent-primary)]/60 hover:text-[var(--accent-primary)]"
                >
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-[var(--text-tertiary)]">{cmd.shortcut || "Go"}</span>
                  {cmd.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 text-[11px] text-[var(--text-tertiary)]">
              <p className="text-[12px] font-semibold text-white">Go shortcuts</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(goShortcuts).map(([key, href]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-2 py-1">
                    <span className="text-white">g {key}</span>
                    <span className="text-[var(--text-tertiary)]">{href}</span>
                  </div>
                ))}
              </div>
              <p className="pt-1 text-[11px] text-[var(--text-disabled)]">Press g then the shortcut key to teleport.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
