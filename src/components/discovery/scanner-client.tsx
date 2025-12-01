"use client";

import { useState } from "react";

export default function ScannerClient() {
  const [text, setText] = useState("");
  const [textLabel, setTextLabel] = useState("");
  const [url, setUrl] = useState("");
  const [urlLabel, setUrlLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const scanText = async () => {
    if (!text.trim()) {
      setError("Paste some text with URLs or project mentions.");
      return;
    }
    setLoading("text");
    setMessage(null);
    setError(null);
    const res = await fetch("/api/discover/scan-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sourceLabel: textLabel || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to scan text");
      setLoading(null);
      return;
    }
    const created = data.createdCount || 0;
    const skipped = data.skippedCount || 0;
    setMessage(`Created ${created} opportunities${skipped ? ` (skipped ${skipped} duplicates)` : ""}.`);
    setLoading(null);
  };

  const scanPage = async () => {
    setLoading("page");
    setMessage(null);
    setError(null);
    if (!/^https?:\/\//i.test(url)) {
      setError("Please enter a valid http(s) URL.");
      setLoading(null);
      return;
    }
    try {
      const res = await fetch("/api/discover/scan-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sourceLabel: urlLabel || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to scan page");
        setLoading(null);
        return;
      }
      const created = data.createdCount || 0;
      const skipped = data.skippedCount || 0;
      setMessage(`Created ${created} opportunities${skipped ? ` (skipped ${skipped} duplicates)` : ""}.`);
    } catch {
      setError("Failed to scan page");
    }
    setLoading(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Scan text for opportunities</p>
          <p className="text-xs text-slate-400">Paste tweets, chats, or notes. We&apos;ll extract URLs.</p>
        </div>
        <input
          value={textLabel}
          onChange={(e) => setTextLabel(e.target.value)}
          placeholder="Source label (optional)"
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Paste tweets, Telegram logs, notes here..."
        />
        <button
          onClick={scanText}
          disabled={loading === "text"}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading === "text" ? "Scanning..." : "Scan text"}
        </button>
      </div>
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Scan page for opportunities</p>
          <p className="text-xs text-slate-400">Provide a URL to extract candidate project links.</p>
        </div>
        <input
          value={urlLabel}
          onChange={(e) => setUrlLabel(e.target.value)}
          placeholder="Source label (optional)"
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <button
          onClick={scanPage}
          disabled={loading === "page"}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading === "page" ? "Scanning..." : "Scan page"}
        </button>
      </div>
      {message ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          <p>{message}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <a href="/radar" className="text-emerald-300 hover:underline">
              Open Radar
            </a>
            <a href="/leads/review" className="text-emerald-300 hover:underline">
              Start Lead Review
            </a>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
