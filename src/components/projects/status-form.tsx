"use client";

import { PROJECT_STATUSES } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

export function ProjectStatusForm({
  projectId,
  status,
  nextFollowUpAt,
}: {
  projectId: string;
  status: string;
  nextFollowUpAt: string | null;
}) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [followUp, setFollowUp] = useState(nextFollowUpAt ? nextFollowUpAt.split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (payload?: { status?: string; nextFollowUpAt?: string | null; lastContactAt?: string | null }) => {
    if (saving) return; // Prevent concurrent requests
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: payload?.status ?? currentStatus,
          nextFollowUpAt: (payload?.nextFollowUpAt ?? followUp) || null,
          lastContactAt: payload?.lastContactAt ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update project");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }, [projectId, currentStatus, followUp, saving, router]);

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs text-slate-400">Status</label>
        <select
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          value={currentStatus}
          onChange={(e) => setCurrentStatus(e.target.value)}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-slate-950">
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-slate-400">Next follow-up</label>
        <input
          type="date"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </div>
      <button
        onClick={() => update()}
        className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save"}
      </button>
      <button
        onClick={() => update({ lastContactAt: new Date().toISOString() })}
        className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 disabled:opacity-60"
        disabled={saving}
      >
        Log contact now
      </button>
    </div>
  );
}
