"use client";

import { useState, useTransition } from "react";

type Playbook = { id: string; name: string };
type Contact = { id: string; name: string; role: string | null };

export default function SequenceBuilder({
  projectId,
  contacts,
  playbooks,
}: {
  projectId: string;
  contacts: Contact[];
  playbooks: Playbook[];
}) {
  const [contactId, setContactId] = useState<string>("");
  const [playbookId, setPlaybookId] = useState<string>("");
  const [touches, setTouches] = useState<number>(3);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");

  const createSequence = async () => {
    setStatus("");
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/sequences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, touches, playbookId: playbookId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to create sequence");
      } else {
        setStatus("Sequence created");
      }
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white">Sequence builder</h3>
      <p className="text-[11px] text-slate-400">Uses account playbook angles/personas automatically when generating steps.</p>
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <label className="text-xs text-slate-400">Contact</label>
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white"
          >
            <option value="">Select contact</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.role ? `(${c.role})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Playbook (optional)</label>
          <select
            value={playbookId}
            onChange={(e) => setPlaybookId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white"
          >
            <option value="">None</option>
            {playbooks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Touches (3–4)</label>
          <input
            type="number"
            min={3}
            max={4}
            value={touches}
            onChange={(e) => setTouches(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white"
          />
        </div>
        <button
          onClick={createSequence}
          disabled={pending || !contactId}
          className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {pending ? "Creating..." : "Create Sequence"}
        </button>
        {status ? <p className="text-xs text-slate-300">{status}</p> : null}
      </div>
    </div>
  );
}
