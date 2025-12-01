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
    <div className="flex flex-col gap-6 px-8 py-10 md:py-12 lg:px-10 xl:max-w-5xl xl:mx-auto">
      <PageHeader title="Quick Capture" description="Save accounts and people in seconds." mode="execute" />
      <div className="flex items-center gap-2">
        {tabButton("projects", "Projects")}
        {tabButton("contacts", "Contacts")}
      </div>

      {tab === "projects" ? (
        <Card className="space-y-3 rounded-xl border border-white/10 bg-[#0F1012] p-5 text-sm text-slate-200 shadow-lg shadow-black/20">
          <SectionHeader title="Project bookmarklet" helper="Drag or copy to capture the current tab as a project" />
          <div className="space-y-1">
            <label className="text-xs text-slate-400">App origin (use https://127.0.0.1:3090 if browsing https sites)</label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <PrimaryButton onClick={(e) => e.preventDefault()} draggable title="Drag this to your bookmarks bar">
            Quick Capture (drag to bookmarks)
          </PrimaryButton>
          <p className="text-xs text-slate-400">Bookmarklet points to: {origin}/tools/quick-capture</p>
          <p className="text-xs text-slate-500">Ensure you are logged in before clicking it. Allow pop-ups for this site.</p>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Bookmarklet code (copy & create a bookmark manually)</label>
            <textarea
              readOnly
              value={bookmarklet}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
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
          <SectionHeader title="Quick contact" helper="Drop a contact with minimal fields" />
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
