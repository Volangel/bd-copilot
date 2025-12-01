"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { PrimaryButton, SecondaryButton, GhostButton } from "@/components/ui/buttons";
import { Skeleton } from "@/components/ui/skeleton";
import { parseJsonString } from "@/lib/parsers";
import Link from "next/link";

type Step = {
  id: string;
  channel: string;
  content: string;
  scheduledAt: string | null;
  sequence: {
    project: {
      id: string;
      name: string | null;
      url: string;
      bdAngles?: string | null;
      playbookAngles?: string | null;
    };
    contact: { id: string; name: string; role: string | null; persona?: string | null; channelPreference?: string | null };
  };
};

export default function SequenceMode() {
  const [step, setStep] = useState<Step | null>(null);
  const [status, setStatus] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const loadStep = async () => {
    const res = await fetch("/api/sequences/next-step");
    const data = await res.json();
    setStep(data.step);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      loadStep();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const updateStep = (action: "sent" | "skip" | "reschedule", date?: string) => {
    if (!step) return;
    startTransition(async () => {
      const res = await fetch("/api/sequences/next-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id, action, scheduledAt: date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed to update");
      } else {
        setStatus("Updated");
        await loadStep();
      }
    });
  };

  if (loading) {
    return (
      <Card>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-24 w-full" />
      </Card>
    );
  }

  if (!step) {
    return <EmptyState title="No pending sequence steps" description="You’re caught up. Check later or build more sequences." icon="✅" />;
  }

  const persona =
    step.sequence.contact.persona ||
    (step.sequence.contact.role &&
      (/founder|ceo|cto|co[- ]founder/i.test(step.sequence.contact.role)
        ? "Technical founder"
        : /engineer|developer|dev|protocol/i.test(step.sequence.contact.role)
          ? "Protocol engineer"
          : /bd|business|growth|ecosystem/i.test(step.sequence.contact.role)
            ? "BD / ecosystem lead"
            : undefined));
  const playbookAngles = parseJsonString<string[]>(step.sequence.project.playbookAngles, []);
  const bdAngles = parseJsonString<string[]>(step.sequence.project.bdAngles, []);
  const angle = playbookAngles[0] || bdAngles[0];

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-400">Next sequence step</p>
          <p className="text-sm text-white">
            {step.sequence.project.name || step.sequence.project.url} → {step.sequence.contact.name} ({step.sequence.contact.role || "—"})
          </p>
          {step.sequence.contact.channelPreference ? (
            <p className="text-[11px] text-emerald-300">Prefers {step.sequence.contact.channelPreference}</p>
          ) : null}
          {(persona || angle) ? (
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-emerald-200">
              {persona ? <span className="rounded-full bg-emerald-500/10 px-2 py-1">Persona: {persona}</span> : null}
              {angle ? <span className="rounded-full border border-emerald-500/40 px-2 py-1 text-emerald-200">Angle: {angle}</span> : null}
            </div>
          ) : null}
        </div>
        <Badge variant="info">{step.channel}</Badge>
      </div>
      <div className="rounded border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200 whitespace-pre-wrap">{step.content}</div>
      <div className="flex flex-wrap gap-2 text-xs">
        <PrimaryButton
          onClick={() => {
            navigator.clipboard.writeText(step.content);
            updateStep("sent");
          }}
          disabled={pending}
        >
          Copy & Mark Sent
        </PrimaryButton>
        <GhostButton
          onClick={() => updateStep("skip")}
          disabled={pending}
          className="border border-slate-700 px-3 py-2 text-slate-200 hover:border-slate-500 disabled:opacity-60"
        >
          Skip
        </GhostButton>
        <SecondaryButton
          onClick={() => {
            const date = prompt("Reschedule to (YYYY-MM-DD):");
            if (date) updateStep("reschedule", date);
          }}
          disabled={pending}
          className="px-3 py-2"
        >
          Reschedule
        </SecondaryButton>
        <Link
          href={`/projects/${step.sequence.project.id}/workspace?contactId=${step.sequence.contact.id}&stepId=${step.id}`}
          className="inline-flex items-center rounded border border-white/20 px-3 py-2 text-[11px] text-slate-100 transition hover:border-white/40 hover:bg-white/5"
        >
          Open in workspace
        </Link>
      </div>
      {status ? <p className="text-xs text-slate-400">{status}</p> : null}
    </Card>
  );
}
