"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ContactForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, linkedinUrl, twitterHandle, email, telegram }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to add contact");
      setLoading(false);
      return;
    }

    setName("");
    setRole("");
    setLinkedinUrl("");
    setTwitterHandle("");
    setEmail("");
    setTelegram("");
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Add contact</p>
        <button
          type="submit"
          className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Role</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">LinkedIn</label>
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="https://linkedin.com/in/..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Twitter</label>
          <input
            value={twitterHandle}
            onChange={(e) => setTwitterHandle(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="@handle"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="person@company.xyz"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Telegram</label>
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="@username"
          />
        </div>
      </div>
    </form>
  );
}
