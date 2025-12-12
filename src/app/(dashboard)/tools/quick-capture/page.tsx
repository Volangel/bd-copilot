"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/buttons";
import { ContactCaptureForm } from "@/components/contacts/contact-capture-form";
import { useSearchParams, useRouter } from "next/navigation";

export default function QuickCapturePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams?.get("tab") === "contacts" ? "contacts" : "projects";
  const [origin, setOrigin] = useState(
    () => (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3090"),
  );
  const [capturedUrl] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("url") : null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runCapture = async () => {
      if (!capturedUrl) return;
      setStatus("Saving...");
      setError(null);
      try {
        const res = await fetch("/api/projects/quick-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: capturedUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to save project");
          setStatus(null);
          return;
        }
        setStatus("Saved! You can close this tab.");
      } catch {
        setError("Failed to save project");
        setStatus(null);
      }
    };

    runCapture();
  }, [capturedUrl]);

  const setTab = (next: "projects" | "contacts") => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", next);
    router.push(`/tools/quick-capture?${params.toString()}`);
  };

  const bookmarklet = useMemo(
    () =>
      `javascript:(function(){const base='${origin}';const url=encodeURIComponent(window.location.href);window.open(base+'/tools/quick-capture?tab=projects&url='+url,'_blank');})();`,
    [origin],
  );

  const tabButton = (key: "projects" | "contacts", label: string) => {
    const active = tab === key;
    return (
      <button
        onClick={() => setTab(key)}
        className={`rounded-full px-3 py-1 text-sm transition ${
          active ? "bg-emerald-500 text-slate-950" : "border border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Quick Capture" description="Save accounts and people in seconds." mode="execute" />

      {/* Info card */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 ring-1 ring-purple-500/30">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Fast capture from any page</p>
            <p className="text-xs text-slate-400">Use the bookmarklet or form below to quickly save accounts and contacts</p>
          </div>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex items-center gap-2">
        {tabButton("projects", "Projects")}
        {tabButton("contacts", "Contacts")}
      </div>

      {tab === "projects" ? (
        <Card className="space-y-4 rounded-xl border border-white/10 bg-[#0F1012] p-5 text-sm text-slate-200 shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Project bookmarklet</p>
              <p className="text-xs text-slate-400">Drag or copy to capture the current tab as a project</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-slate-400">App origin</label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">Use https://127.0.0.1:3090 if browsing https sites</p>
          </div>

          <PrimaryButton onClick={(e) => e.preventDefault()} draggable title="Drag this to your bookmarks bar">
            Quick Capture (drag to bookmarks)
          </PrimaryButton>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-slate-400 mb-2">Bookmarklet points to: <span className="text-emerald-300">{origin}/tools/quick-capture</span></p>
            <p className="text-xs text-slate-500">Ensure you are logged in before clicking it. Allow pop-ups for this site.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-slate-400">Bookmarklet code (copy manually)</label>
            <textarea
              readOnly
              value={bookmarklet}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
              rows={3}
              onFocus={(e) => e.target.select()}
            />
          </div>

          {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </Card>
      ) : null}

      {tab === "contacts" ? (
        <Card className="space-y-4 rounded-xl border border-white/10 bg-[#0F1012] p-5 shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/30">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Quick contact</p>
              <p className="text-xs text-slate-400">Drop a contact with minimal fields</p>
            </div>
          </div>

          <ContactCaptureForm
            onSuccess={({ projectId, contactId, projectName }) => {
              setStatus(`Saved to ${projectName || projectId}`);
              router.push(`/projects/${projectId}/workspace?contactId=${contactId}`);
            }}
          />
          {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </Card>
      ) : null}
    </div>
  );
}
