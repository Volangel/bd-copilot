"use client";

import { useState } from "react";
import type { ContactCandidate } from "@/lib/contacts/types";
import { Toast } from "@/components/ui/toast";

export function AIContactFinder({ projectId }: { projectId: string }) {
  const [isScanning, setIsScanning] = useState(false);
  const [candidates, setCandidates] = useState<ContactCandidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const runScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts/deep-discover`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Scan failed");
        setToast({ message: data.error || "Scan failed", type: "error" });
        setIsScanning(false);
        return;
      }
      const data = await res.json();
      const list: ContactCandidate[] = data.candidates || [];
      setCandidates(list);
      setSelected(new Set(list.map((_, idx) => idx)));
      setToast({
        message: list.length ? `Found ${list.length} candidates` : "No contacts found (AI may be disabled or no team pages found)",
        type: list.length ? "success" : "error",
      });
    } catch {
      setError("Scan failed");
      setToast({ message: "Scan failed", type: "error" });
    }
    setIsScanning(false);
  };

  const toggle = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  };

  const importSelected = async () => {
    const payload = candidates.filter((_, idx) => selected.has(idx)).map((c) => ({
      name: c.name,
      role: c.role,
      linkedinUrl: c.linkedinUrl,
      twitterHandle: c.twitterHandle,
      email: c.email,
      telegram: c.telegram,
    }));
    if (payload.length === 0) {
      setError("Select at least one contact");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to import");
        setImporting(false);
        return;
      }
      setToast({ message: "Contacts imported", type: "success" });
      setImporting(false);
      window.location.reload();
    } catch {
      setError("Failed to import");
      setToast({ message: "Failed to import", type: "error" });
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">AI Contact Finder</p>
          <p className="text-xs text-slate-500">
            Deep scan the site for team members and add the ones you want.
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={isScanning}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {isScanning ? "Scanning..." : "Run AI contact scan"}
        </button>
      </div>
      {error ? <div className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-200">{error}</div> : null}
      {candidates.length === 0 && !isScanning ? (
        <p className="text-xs text-slate-500">No AI candidates yet. Run a scan to see suggestions.</p>
      ) : null}
      {candidates.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Tags</th>
                <th className="px-3 py-2 text-left">Links</th>
                <th className="px-3 py-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {candidates.map((c, idx) => (
                <tr key={`${c.name}-${idx}`} className="bg-[#0F1012]">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(idx)}
                      onChange={() => toggle(idx)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                    />
                  </td>
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 text-slate-300">{c.role || "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{(c.tags || []).join(", ") || "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-400 space-y-1">
                    {c.linkedinUrl ? (
                      <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="block text-emerald-300 hover:underline">
                        LinkedIn
                      </a>
                    ) : null}
                    {c.twitterHandle ? <span className="block text-slate-300">{c.twitterHandle}</span> : null}
                    {c.email ? <span className="block text-slate-300">{c.email}</span> : null}
                    {c.telegram ? <span className="block text-slate-300">{c.telegram}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    <div className="space-y-1">
                      <span className="rounded bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-300">
                        {c.sourceType === "heuristic" ? "Heuristic" : "AI"}
                      </span>
                      <div className="text-[11px] text-slate-500">{c.sourceUrl || "-"}</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {candidates.length > 0 ? (
        <div className="flex justify-end">
          <button
            onClick={importSelected}
            disabled={importing}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {importing ? "Importing..." : "Add selected as contacts"}
          </button>
        </div>
      ) : null}
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
