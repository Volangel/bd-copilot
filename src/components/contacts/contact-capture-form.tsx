"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/toast";

type ProjectOption = { id: string; label: string };
type ApiProject = { id: string; name?: string | null; url?: string | null };

export function ContactCaptureForm({
  defaultProjectId,
  defaultProjectUrl,
  defaultName,
  defaultRole,
  onSuccess,
  compact,
  refreshOnSuccess,
}: {
  defaultProjectId?: string;
  defaultProjectUrl?: string;
  defaultName?: string;
  defaultRole?: string;
  onSuccess?: (result: { projectId: string; contactId: string; projectName?: string; created: boolean }) => void;
  compact?: boolean;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [projectUrl, setProjectUrl] = useState(defaultProjectUrl || "");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState(defaultName || "");
  const [role, setRole] = useState(defaultRole || "");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch("/api/projects?limit=50");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.projects)) {
          const mapped = (data.projects as ApiProject[]).map((p) => ({ id: p.id, label: p.name || p.url || "Untitled" }));
          setProjects(mapped);
        }
      } catch {
        return;
      }
    };
    loadProjects();
  }, []);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role: role || undefined,
          projectId: projectId || undefined,
          projectUrl: projectUrl || undefined,
          companyName: companyName || undefined,
          linkedinUrl: linkedinUrl || undefined,
          twitterUrlOrHandle: twitter || undefined,
          telegram: telegram || undefined,
          email: email || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save contact");
        setToast({ message: data.error || "Failed to save contact", type: "error" });
        setLoading(false);
        return;
      }
      setToast({ message: data.created ? "Contact created" : "Contact merged", type: "success" });
      setLoading(false);
      if (refreshOnSuccess && router) {
        router.refresh();
      }
      onSuccess?.(data);
      setName("");
      setRole("");
      setLinkedinUrl("");
      setTwitter("");
      setTelegram("");
      setEmail("");
      setNotes("");
      if (!defaultProjectId) {
        setProjectId("");
        setProjectUrl("");
        setCompanyName("");
      }
    } catch {
      setError("Failed to save contact");
      setToast({ message: "Failed to save contact", type: "error" });
      setLoading(false);
    }
  };

  const enrichFromUrl = async () => {
    if (!socialUrl.trim()) {
      setToast({ message: "Paste a social URL first", type: "error" });
      return;
    }
    setEnriching(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/enrich-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: socialUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ message: data.error || "Failed to fetch info", type: "error" });
        setEnriching(false);
        return;
      }
      const s = data.suggestion || {};
      if (s.name) setName(s.name);
      if (s.role) setRole(s.role);
      if (s.linkedinUrl) setLinkedinUrl(s.linkedinUrl);
      if (s.twitterHandle) setTwitter(s.twitterHandle);
      if (s.telegram) setTelegram(s.telegram);
      if (s.email) setEmail(s.email);
      setToast({ message: "Auto-filled from URL", type: "success" });
    } catch {
      setToast({ message: "Failed to fetch info", type: "error" });
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="space-y-3 text-sm text-slate-200">
      {!compact ? <p className="text-xs text-slate-400">Provide at least a name and either project selection, URL, or company name.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs text-slate-400">Social/profile URL (auto-fill)</label>
          <div className="flex gap-2">
            <input
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={enrichFromUrl}
              disabled={enriching}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {enriching ? "Fetching..." : "Auto-fill"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Paste LinkedIn, X/Twitter, Telegram, or mailto to prefill fields. You can still edit.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-950">
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Project URL</label>
          <input
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            placeholder="https://project.xyz"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Company / Project name</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Example Protocol"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Name*</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Role</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Founder, BD lead, Engineer"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">LinkedIn URL</label>
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Twitter URL or @handle</label>
          <input
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="https://x.com/user or @user"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Telegram</label>
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="@handle or https://t.me/..."
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-slate-400">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Paste extra context; future versions will auto-parse."
        />
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save contact"}
      </button>
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
