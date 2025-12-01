"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpportunityActions({ opportunityId, projectId }: { opportunityId: string; projectId?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convert = async () => {
    setLoading("convert");
    setError(null);
    const res = await fetch(`/api/discover/${opportunityId}/convert`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to convert");
      setLoading(null);
      return;
    }
    setLoading(null);
    router.refresh();
  };

  const discard = async () => {
    setLoading("discard");
    setError(null);
    const res = await fetch(`/api/discover/${opportunityId}/discard`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to discard");
      setLoading(null);
      return;
    }
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {error ? <p className="text-red-300">{error}</p> : null}
      {!projectId ? (
        <button
          onClick={convert}
          disabled={!!loading}
          className="rounded-lg bg-emerald-500 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading === "convert" ? "Converting..." : "Convert to Project"}
        </button>
      ) : null}
      <button
        onClick={discard}
        disabled={!!loading}
        className="rounded-lg border border-slate-700 px-3 py-1 font-semibold text-slate-200 hover:border-slate-500 disabled:opacity-60"
      >
        {loading === "discard" ? "Discarding..." : "Mark Discarded"}
      </button>
      {projectId ? (
        <a
          href={`/projects/${projectId}`}
          className="rounded-lg border border-emerald-500 px-3 py-1 font-semibold text-emerald-300 hover:bg-emerald-500/10"
        >
          View project
        </a>
      ) : null}
    </div>
  );
}
