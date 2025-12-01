"use client";

import { useState } from "react";

export function WatchlistScanButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runScan = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/discover/scan-watchlist", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || "Failed to scan");
      } else {
        setStatus(`Created ${data.createdCount || 0} opportunities (skipped ${data.skippedCount || 0}).`);
      }
    } catch {
      setStatus("Failed to scan");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={runScan}
        disabled={loading}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        {loading ? "Scanning..." : "Scan watchlist"}
      </button>
      {status ? <p className="text-xs text-slate-300">{status}</p> : null}
    </div>
  );
}
