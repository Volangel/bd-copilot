"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PrimaryButton, GhostButton } from "@/components/ui/buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/header";

// Inline type to avoid Prisma import issues
type Template = {
  id: string;
  userId: string;
  title: string;
  content: string;
  category?: string | null;
  createdAt: Date;
};

export default function TemplateManager({ initial }: { initial: Template[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initial);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save template");
      setSaving(false);
      return;
    }
    const tpl = await res.json();
    setTemplates((prev) => [tpl, ...prev]);
    setTitle("");
    setContent("");
    setSaving(false);
    router.refresh();
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete template");
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    } catch (err) {
      console.error("Delete failed", err);
      setError("Failed to delete template");
    }
  };

  const update = async (id: string, next: { title: string; content: string }) => {
    setError(null);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update template");
        return;
      }
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...next } : t)));
      router.refresh();
    } catch (err) {
      console.error("Update failed", err);
      setError("Failed to update template");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader title="New template" />
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        <div className="mt-3 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Content"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <PrimaryButton onClick={create} disabled={saving} className="px-4 py-2">
            {saving ? "Saving..." : "Save template"}
          </PrimaryButton>
        </div>
      </Card>

      <div className="space-y-3">
        {templates.map((tpl) => (
          <TemplateCard key={tpl.id} template={tpl} onDelete={remove} onUpdate={update} />
        ))}
        {templates.length === 0 ? <EmptyState title="No templates yet" description="Save your first snippet for reuse." icon="🧾" /> : null}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onDelete,
  onUpdate,
}: {
  template: Template;
  onDelete: (id: string) => void;
  onUpdate: (id: string, next: { title: string; content: string }) => void;
}) {
  const [title, setTitle] = useState(template.title);
  const [content, setContent] = useState(template.content);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate(template.id, { title, content });
    setSaving(false);
  };

  return (
    <Card className="text-sm text-slate-200">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <div className="mt-2 flex items-center gap-2 text-xs">
        <PrimaryButton onClick={save} disabled={saving} className="px-3 py-1">
          {saving ? "Saving..." : "Update"}
        </PrimaryButton>
        <GhostButton onClick={() => onDelete(template.id)} className="border border-red-500 px-3 py-1 text-red-200 hover:bg-red-500/20">
          Delete
        </GhostButton>
      </div>
    </Card>
  );
}
