"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function NewProjectForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create project");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setUrl("");
    setName("");
    if (data?.id) {
      router.push(`/projects/${data.id}`);
    } else {
      router.refresh();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-inner">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">New Project</p>
          <p className="text-xs text-slate-400">Paste a URL and we will analyze it for fit.</p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow hover:bg-emerald-400 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Create"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <div className="space-y-2">
        <label className="text-xs text-slate-400" htmlFor="project-name">
          Name (optional)
        </label>
        <input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-600"
          placeholder="Project name"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-slate-400" htmlFor="project-url">
          URL
        </label>
        <input
          id="project-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-600"
          placeholder="https://example.xyz"
          required
        />
      </div>
    </form>
  );
}
