"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseJsonString } from "@/lib/parsers";
import type { Opportunity } from "@prisma/client";
import { Toast } from "@/components/ui/toast";
import { Badge, TagPill } from "@/components/ui/badge";

type Props = {
  opp: Opportunity;
};

export function RadarCard({ opp }: Props) {
  const tags = parseJsonString<string[]>(opp.tags, []);
  const reasons = parseJsonString<string[]>(opp.leadReasons, []).slice(0, 3);
  const playbooks = parseJsonString<string[]>(opp.playbookMatches, []);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();

  const handle = (path: string) => {
    startTransition(async () => {
      setError(null);
      setInfo(null);
      const res = await fetch(path, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Action failed");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (path.includes("/convert") && data?.id) {
        router.push(`/projects/${data.id}/workspace`);
        return;
      }
      setInfo("Updated. Refreshing…");
      router.refresh();
    });
  };

  return (
    <div className="relative rounded-xl border border-[#232527] bg-[#111214] p-4 shadow-sm transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={opp.url} target="_blank" className="text-sm font-semibold text-white hover:text-emerald-300">
            {opp.title || opp.url}
          </Link>
          <p className="text-xs text-slate-500">
            {opp.sourceType}
            {opp.sourceLabel ? ` · ${opp.sourceLabel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-200">
          <Badge variant="info">Lead {opp.leadScore ?? "–"}</Badge>
          <Badge variant="neutral">ICP {opp.icpScore ?? "–"}</Badge>
          <Badge variant="neutral">MQA {opp.mqaScore ?? "–"}</Badge>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((t) => (
          <TagPill key={t}>{t}</TagPill>
        ))}
      </div>
      <div className="mt-2 space-y-1">
        {reasons.map((r, idx) => (
          <p key={idx} className="text-xs text-slate-300">
            • {r}
          </p>
        ))}
      </div>
      {playbooks.length ? (
        <p className="mt-2 text-xs text-emerald-300">Playbook matches: {playbooks.join(", ")}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => handle(`/api/discover/${opp.id}/convert`)}
          disabled={pending}
          className="rounded-lg bg-[#6366F1] px-3 py-2 text-sm font-semibold text-white hover:bg-[#7C82F6] disabled:opacity-60"
        >
          Convert to Project
        </button>
        <button
          onClick={() => handle(`/api/discover/${opp.id}/snooze`)}
          disabled={pending}
          className="rounded-lg border border-[#232527] px-3 py-2 text-sm text-slate-200 hover:bg-[#1E2022] disabled:opacity-60"
        >
          Snooze 7 days
        </button>
        <button
          onClick={() => handle(`/api/discover/${opp.id}/discard`)}
          disabled={pending}
          className="rounded-lg border border-[#EF4444] px-3 py-2 text-sm text-red-200 hover:bg-[#2D1111] disabled:opacity-60"
        >
          Not relevant
        </button>
        <Link
          href={`/leads/review?id=${opp.id}`}
          className="rounded-lg border border-[#232527] px-3 py-2 text-sm text-emerald-300 hover:border-emerald-500"
        >
          Review this lead
        </Link>
      </div>
      <Toast message={error} type="error" onClear={() => setError(null)} />
      <Toast message={info} onClear={() => setInfo(null)} />
    </div>
  );
}
