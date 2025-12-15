"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type SettingsPayload = {
  industries: string;
  painPoints: string;
  filters: Record<string, unknown> | null;
  aiVoice: { tone: string; length: string; formality: string };
  representingProject: {
    name: string;
    website?: string | null;
    oneLiner?: string | null;
    productCategory?: string | null;
    primaryValueProp?: string | null;
    idealCustomer?: string | null;
    keyDifferentiators?: string | null;
    toneGuidelines?: string | null;
    referenceAccounts?: string[] | null;
  } | null;
};

export function SettingsForm({ initial }: { initial: SettingsPayload }) {
  const router = useRouter();
  const [industries, setIndustries] = useState(initial.industries);
  const [painPoints, setPainPoints] = useState(initial.painPoints);
  const [filtersText, setFiltersText] = useState(
    initial.filters && Object.keys(initial.filters).length > 0
      ? JSON.stringify(initial.filters, null, 2)
      : "",
  );
  const [repName, setRepName] = useState(initial.representingProject?.name ?? "");
  const [repWebsite, setRepWebsite] = useState(initial.representingProject?.website ?? "");
  const [repOneLiner, setRepOneLiner] = useState(initial.representingProject?.oneLiner ?? "");
  const [repCategory, setRepCategory] = useState(initial.representingProject?.productCategory ?? "");
  const [repValueProp, setRepValueProp] = useState(initial.representingProject?.primaryValueProp ?? "");
  const [repIdealCustomer, setRepIdealCustomer] = useState(initial.representingProject?.idealCustomer ?? "");
  const [repDifferentiators, setRepDifferentiators] = useState(initial.representingProject?.keyDifferentiators ?? "");
  const [repTone, setRepTone] = useState(initial.representingProject?.toneGuidelines ?? "");
  const [repReferences, setRepReferences] = useState(
    initial.representingProject?.referenceAccounts?.join(", ") ?? "",
  );
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [tone, setTone] = useState(initial.aiVoice.tone);
  const [length, setLength] = useState(initial.aiVoice.length);
  const [formality, setFormality] = useState(initial.aiVoice.formality);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let filters: Record<string, unknown> | null = null;
    if (filtersText.trim().length > 0) {
      try {
        filters = JSON.parse(filtersText) as Record<string, unknown>;
      } catch {
        setError("Filters must be valid JSON");
        setSaving(false);
        return;
      }
    }

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industries,
        painPoints,
        filters,
        aiVoice: { tone, length, formality },
        representingProject:
          repName.trim().length === 0
            ? null
            : {
                name: repName.trim(),
                website: repWebsite || null,
                oneLiner: repOneLiner || null,
                productCategory: repCategory || null,
                primaryValueProp: repValueProp || null,
                idealCustomer: repIdealCustomer || null,
                keyDifferentiators: repDifferentiators || null,
                toneGuidelines: repTone || null,
                referenceAccounts:
                  repReferences.length > 0
                    ? repReferences
                        .split(/[,\\n]/)
                        .map((v) => v.trim())
                        .filter(Boolean)
                    : [],
              },
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save settings");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  };

  const onAutofill = async () => {
    if (!repWebsite.trim()) {
      setAutoError("Add a website first");
      return;
    }
    setAutoError(null);
    setAutoLoading(true);
    try {
      const res = await fetch("/api/settings/representing-autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repWebsite.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAutoError(data.error || "Autofill failed");
        setAutoLoading(false);
        return;
      }
      const data = await res.json();
      const s = data.suggestion || {};
      setRepName(s.name || repName);
      setRepOneLiner(s.oneLiner || repOneLiner);
      setRepCategory(s.productCategory || repCategory);
      setRepValueProp(s.primaryValueProp || repValueProp);
      setRepIdealCustomer(s.idealCustomer || repIdealCustomer);
      setRepDifferentiators(s.keyDifferentiators || repDifferentiators);
      setRepTone(s.toneGuidelines || repTone);
    } catch {
      setAutoError("Autofill failed");
    }
    setAutoLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? <div className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-100">{error}</div> : null}
      {autoError ? <div className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-200">{autoError}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-slate-300">ICP Industries</label>
          <textarea
            value={industries}
            onChange={(e) => setIndustries(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="DeFi, L2 infra, security tooling"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">ICP Pain points</label>
          <textarea
            value={painPoints}
            onChange={(e) => setPainPoints(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Need better liquidity, partner distribution, security messaging"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Filters (JSON)</label>
          <textarea
            value={filtersText}
            onChange={(e) => setFiltersText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder='{"stage": ["growth"], "geo": ["US", "EU"]}'
          />
          <p className="text-xs text-slate-500">Optional: add stage/size/geo filters.</p>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-sm font-semibold text-white">AI Voice</p>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Tone</label>
            <select
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="practical">Practical</option>
              <option value="friendly">Friendly</option>
              <option value="direct">Direct</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Length</label>
            <select
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={length}
              onChange={(e) => setLength(e.target.value)}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Formality</label>
            <select
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={formality}
              onChange={(e) => setFormality(e.target.value)}
            >
              <option value="casual">Casual</option>
              <option value="balanced">Balanced</option>
              <option value="formal">Formal</option>
            </select>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white">Represented Project</label>
          <p className="text-xs text-slate-500">
            Tell the copilot who you represent so outreach uses the right voice and value prop.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Project name</label>
          <input
            value={repName}
            onChange={(e) => setRepName(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="e.g., Hypernative"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Website</label>
          <input
            value={repWebsite}
            onChange={(e) => setRepWebsite(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="https://yourproject.com"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAutofill}
              className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60"
              disabled={autoLoading}
            >
              {autoLoading ? "Autofilling..." : "Autofill from website"}
            </button>
            <p className="text-[11px] text-slate-500">Uses AI to draft one-liner/value prop from your site.</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">One-liner</label>
          <input
            value={repOneLiner}
            onChange={(e) => setRepOneLiner(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="How you introduce the project in one sentence"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Product category</label>
          <input
            value={repCategory}
            onChange={(e) => setRepCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Web3 security, L2 rollup, Perp DEX, etc."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Primary value prop</label>
          <textarea
            value={repValueProp}
            onChange={(e) => setRepValueProp(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="What you usually lead with in outreach"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Ideal customer</label>
          <textarea
            value={repIdealCustomer}
            onChange={(e) => setRepIdealCustomer(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Who this project is for (from your side)"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Key differentiators</label>
          <textarea
            value={repDifferentiators}
            onChange={(e) => setRepDifferentiators(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Bullets or short paragraph on what makes you different"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Reference accounts</label>
          <textarea
            value={repReferences}
            onChange={(e) => setRepReferences(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Comma or newline separated (only projects you've worked with)"
          />
          <p className="text-xs text-slate-500">Used as social proof in outreach.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Tone guidelines</label>
          <textarea
            value={repTone}
            onChange={(e) => setRepTone(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="e.g., confident, no hype, no emojis"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}
