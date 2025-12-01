"use client";

import { useState } from "react";
import { Toast } from "@/components/ui/toast";

const PERSONA_OPTIONS = [
  "",
  "Technical founder",
  "Protocol engineer",
  "BD / ecosystem lead",
  "Security lead",
  "Marketing/Growth",
];

export function ContactPersonaSelect({
  projectId,
  contactId,
  value,
}: {
  projectId: string;
  contactId: string;
  value?: string | null;
}) {
  const [current, setCurrent] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const update = async (next: string) => {
    setCurrent(next);
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, persona: next || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: "Persona updated", type: "success" });
    } catch {
      setToast({ message: "Failed to update persona", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1 text-[11px]">
      <p className="text-slate-400">Persona</p>
      <select
        disabled={loading}
        value={current}
        onChange={(e) => update(e.target.value)}
        className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-white"
      >
        {PERSONA_OPTIONS.map((opt) => (
          <option key={opt || "none"} value={opt}>
            {opt ? opt : "Not set"}
          </option>
        ))}
      </select>
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
