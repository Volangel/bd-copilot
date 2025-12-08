"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return commands;
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(normalizedQuery));
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const comboHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === "g") {
        gPressed.current = true;
        window.setTimeout(() => {
          gPressed.current = false;
        }, 800);
        return;
      }

      if (!gPressed.current) return;

      const destination = goShortcuts[key];
      if (destination) {
        e.preventDefault();
        router.push(destination);
      }
      gPressed.current = false;
    };

    window.addEventListener("keydown", handler);
    window.addEventListener("keydown", comboHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keydown", comboHandler);
    };
  }, [router]);

  const activate = (action: string) => {
    router.push(action);
    setOpen(false);
    setQuery("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command..."
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <div className="mt-3 max-h-64 space-y-1 overflow-auto">
          {filtered.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => activate(cmd.action)}
              className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-sm text-slate-200 hover:border-slate-700"
            >
              <span>{cmd.label}</span>
              {cmd.shortcut ? <span className="text-xs text-slate-500">{cmd.shortcut}</span> : null}
            </button>
          ))}
          {filtered.length === 0 ? <p className="text-xs text-slate-500">No commands</p> : null}
        </div>
        <div className="mt-2 text-right text-xs text-slate-500">Cmd+K / Ctrl+K to close</div>
      </div>
    </div>
  );
}
