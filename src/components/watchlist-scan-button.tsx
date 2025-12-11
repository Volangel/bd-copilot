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
        if (res.status === 401) {
          setStatus("Unauthorized - please log in again");
        } else if (res.status === 404) {
          setStatus("No watchlist URLs found - add some first");
        } else {
          setStatus(data.error || "Failed to scan watchlist");
        }
      } else if (data.createdCount === 0 && data.skippedCount === 0) {
        setStatus("No new opportunities found from watchlist URLs");
      } else {
        setStatus(`Created ${data.createdCount || 0} opportunities (skipped ${data.skippedCount || 0}).`);
      }
    } catch {
      setStatus("Network error - please check your connection");
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
