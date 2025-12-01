"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Toast } from "@/components/ui/toast";

type Step = {
  id: string;
  stepNumber: number;
  channel: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
};

export function StepListClient({ steps, highlightId }: { steps: Step[]; highlightId?: string | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!highlightId || !ref.current) return;
    const el = ref.current.querySelector<HTMLElement>(`[data-step-id="${highlightId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);

  const markStep = async (id: string, action: "SENT" | "SKIPPED") => {
    try {
      const res = await fetch("/api/sequences/next-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: id, action }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: action === "SENT" ? "Step marked sent" : "Step skipped", type: "success" });
      router.refresh();
    } catch {
      setToast({ message: "Failed to update step", type: "error" });
    }
  };

  return (
    <>
      <div ref={ref} className="space-y-2">
        {steps.map((st) => {
          const isHighlighted = st.id === highlightId;
          return (
            <div
              key={st.id}
              data-step-id={st.id}
              className={`rounded-lg border px-3 py-2 text-xs ${
                isHighlighted ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">
                  Step {st.stepNumber} · {st.channel}
                </p>
                <p className="text-[11px] text-slate-500">{st.status}</p>
              </div>
              <p className="text-slate-300">{st.content}</p>
              <p className="text-[11px] text-slate-500">
                {st.scheduledAt ? `Scheduled: ${formatDate(st.scheduledAt)}` : st.sentAt ? `Sent: ${formatDate(st.sentAt)}` : "Not scheduled"}
              </p>
              <div className="mt-2 flex gap-2 text-[11px]">
                <button
                  onClick={() => markStep(st.id, "SENT")}
                  className="rounded border border-emerald-400/50 px-2 py-1 text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  Mark sent
                </button>
                <button
                  onClick={() => markStep(st.id, "SKIPPED")}
                  className="rounded border border-white/20 px-2 py-1 text-slate-200 transition hover:bg-white/10"
                >
                  Skip
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </>
  );
}
