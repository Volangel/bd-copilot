"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function NoteForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save note");
      setSaving(false);
      return;
    }
    setContent("");
    setSaving(false);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
        placeholder="Add note or activity..."
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add note"}
        </button>
      </div>
    </form>
  );
}
