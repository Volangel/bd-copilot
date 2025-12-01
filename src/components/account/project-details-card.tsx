"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PrimaryButton, SecondaryButton } from "@/components/ui/buttons";

type ProjectDetailsProps = {
  projectId: string;
  project: {
    name: string | null;
    stage: string | null;
    summary: string | null;
    targetUsers: string | null;
    painPoints: string | null;
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
    github: string | null;
    medium: string | null;
  };
  tags: string[];
  action: (formData: FormData) => Promise<void>;
};

export function ProjectDetailsCard({ project, tags, action }: ProjectDetailsProps) {
  const [editing, setEditing] = useState(false);

  const viewField = (label: string, value?: string | null) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-200">{value || "—"}</p>
    </div>
  );

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Project details</p>
        <SecondaryButton type="button" onClick={() => setEditing((v) => !v)} className="px-3 py-1 text-xs">
          {editing ? "Cancel" : "Edit project"}
        </SecondaryButton>
      </div>

      {!editing ? (
        <div className="grid gap-4 md:grid-cols-2">
          {viewField("Name", project.name)}
          {viewField("Stage", project.stage)}
          <div className="md:col-span-2">{viewField("Summary", project.summary)}</div>
          {viewField("Target users", project.targetUsers)}
          {viewField("Pain points", project.painPoints)}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.length
                ? tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="bg-[#1E2022] text-xs font-semibold">
                      {tag}
                    </Badge>
                  ))
                : <p className="text-sm text-slate-400">—</p>}
            </div>
          </div>
          <div className="md:col-span-2 grid gap-2 md:grid-cols-3">
            {viewField("Twitter / X", project.twitter)}
            {viewField("Telegram", project.telegram)}
            {viewField("Discord", project.discord)}
            {viewField("GitHub", project.github)}
            {viewField("Medium", project.medium)}
          </div>
        </div>
      ) : (
        <form action={action} className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400">Name</label>
            <input name="name" defaultValue={project.name ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Stage</label>
            <input name="stage" defaultValue={project.stage ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">Summary</label>
            <textarea
              name="summary"
              rows={2}
              defaultValue={project.summary ?? ""}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Target users</label>
            <input name="targetUsers" defaultValue={project.targetUsers ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Pain points</label>
            <input name="painPoints" defaultValue={project.painPoints ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Tags (comma separated)</label>
            <input name="tags" defaultValue={tags.join(", ")} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Twitter / X</label>
            <input name="twitter" defaultValue={project.twitter ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Telegram</label>
            <input name="telegram" defaultValue={project.telegram ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Discord</label>
            <input name="discord" defaultValue={project.discord ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">GitHub</label>
            <input name="github" defaultValue={project.github ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Medium</label>
            <input name="medium" defaultValue={project.medium ?? ""} className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setEditing(false)} className="px-4 py-2">
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" className="px-4 py-2">
              Save project
            </PrimaryButton>
          </div>
        </form>
      )}
    </Card>
  );
}
