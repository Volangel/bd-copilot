"use client";

import { useState, useTransition } from "react";

type Props = {
  projectId: string;
  contacts: { id: string; name: string }[];
};

export function InteractionForm({ projectId, contacts }: Props) {
  const [status, setStatus] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const submit = async (formData: FormData) => {
    setStatus("");
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/interactions`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data.error || "Failed to log interaction");
      } else {
        setStatus("Saved");
        (document.getElementById("interaction-form") as HTMLFormElement | null)?.reset();
      }
    });
  };

  return (
    <form id="interaction-form" action={submit} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label className="text-xs text-slate-400">Channel</label>
          <select name="channel" className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white">
            <option value="email">Email</option>
            <option value="telegram">Telegram</option>
            <option value="twitter">Twitter</option>
            <option value="linkedin">LinkedIn</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Type</label>
          <select name="type" className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white">
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
            <option value="internal_note">Internal note</option>
          </select>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label className="text-xs text-slate-400">Contact (optional)</label>
          <select name="contactId" className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white">
            <option value="">None</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Occurred at</label>
          <input name="occurredAt" type="datetime-local" className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white" />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400">Title</label>
        <input name="title" className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="e.g., Follow-up call" />
      </div>
      <div>
        <label className="text-xs text-slate-400">Body</label>
        <textarea name="body" rows={2} className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="Notes or summary" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Log interaction"}
      </button>
      {status ? <p className="text-xs text-slate-400">{status}</p> : null}
    </form>
  );
}
