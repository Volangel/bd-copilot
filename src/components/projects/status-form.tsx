"use client";

import { PROJECT_STATUSES } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const update = async (payload?: { status?: string; nextFollowUpAt?: string | null; lastContactAt?: string | null }) => {
    setSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: payload?.status ?? currentStatus,
        nextFollowUpAt: (payload?.nextFollowUpAt ?? followUp) || null,
        lastContactAt: payload?.lastContactAt ?? undefined,
      }),
    });
    setSaving(false);
    router.refresh();
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
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
