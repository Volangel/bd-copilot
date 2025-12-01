"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/ui/toast";

const CHANNELS = ["linkedin", "twitter", "telegram", "email"] as const;

type Channel = (typeof CHANNELS)[number];

type TemplateOption = { id: string; title: string; content: string };

export function OutreachForm({
  projectId,
  contactId,
  contactName,
  projectName,
  templates = [],
  personaLabel,
  angleLabel,
}: {
  projectId: string;
  contactId: string;
  contactName: string;
  projectName: string;
  templates?: TemplateOption[];
  personaLabel?: string | null;
  angleLabel?: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Channel[]>(["linkedin", "email"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customContent, setCustomContent] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const toggleChannel = (channel: Channel) => {
    setSelected((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      const filled = tpl.content
        .replace(/{{contact}}/g, contactName)
        .replace(/{{project}}/g, projectName);
      setCustomContent(filled);
    } else {
      setCustomContent("");
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/outreach/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, contactId, channels: selected, customContent: customContent || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to generate outreach");
      setLoading(false);
      setToast({ message: data.error || "Failed to generate outreach", type: "error" });
      return;
    }
    setLoading(false);
    setToast({ message: "Outreach generated", type: "success" });
    setCustomContent("");
    setSelectedTemplate("");
    router.refresh();
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <p className="text-xs font-semibold text-slate-200">Generate outreach</p>
      {(personaLabel || angleLabel) ? (
        <p className="text-[11px] text-slate-400">
          {personaLabel ? `Persona: ${personaLabel}` : ""} {angleLabel ? `· Angle: ${angleLabel}` : ""}
        </p>
      ) : null}
      {templates.length > 0 ? (
        <div className="space-y-1 text-xs">
          <label className="text-slate-400">Template</label>
          <select
            value={selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="">None</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id} className="bg-slate-950">
                {tpl.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="space-y-1 text-xs">
        <label className="text-slate-400">Custom content (optional)</label>
        <textarea
          value={customContent}
          onChange={(e) => setCustomContent(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Use template or type your own outreach copy"
        />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {CHANNELS.map((channel) => {
          const active = selected.includes(channel);
          return (
            <button
              type="button"
              key={channel}
              onClick={() => toggleChannel(channel)}
              className={`rounded-full px-3 py-1 transition ${
                active
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500"
              }`}
            >
              {channel}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <button
        onClick={onSubmit}
        className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        disabled={loading || selected.length === 0}
      >
        {loading ? "Generating..." : "Generate"}
      </button>
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
