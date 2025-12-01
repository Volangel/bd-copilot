"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS = [
  { days: "1", label: "+ 1-day follow-up" },
  { days: "3", label: "+ 3-day follow-up" },
  { days: "7", label: "+ 7-day follow-up" },
];

export function QuickFollowup({ projectId, contactId }: { projectId: string; contactId: string }) {
  const router = useRouter();
  const [loadingDays, setLoadingDays] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schedule = async (days: string) => {
    setLoadingDays(days);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, days, channel: "email" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to schedule follow-up");
      setLoadingDays(null);
      return;
    }
    setLoadingDays(null);
    router.refresh();
  };

  return (
    <div className="space-y-1 text-xs text-slate-300">
      <p className="text-[11px] uppercase text-slate-400">Quick follow-up</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => schedule(opt.days)}
            disabled={!!loadingDays}
            className="rounded-full border border-slate-700 px-3 py-1 hover:border-emerald-400 disabled:opacity-60"
          >
            {loadingDays === opt.days ? "Scheduling..." : opt.label}
          </button>
        ))}
      </div>
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}
