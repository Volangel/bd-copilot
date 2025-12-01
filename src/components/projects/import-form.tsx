"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a CSV file");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/projects/import", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Import failed");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setMessage(`Imported ${data.success} projects. Skipped ${data.skipped}.`);
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="space-y-2">
        <label className="text-sm text-slate-300">CSV file</label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-sm text-slate-200"
        />
        <p className="text-xs text-slate-500">Headers: url (required), name (optional). Max 50 rows.</p>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        {loading ? "Importing..." : "Import"}
      </button>
    </form>
  );
}
