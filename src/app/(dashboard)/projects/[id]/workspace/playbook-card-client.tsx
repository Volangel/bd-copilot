"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/buttons";
import { Toast } from "@/components/ui/toast";

export function PlaybookCardClient({
  projectId,
  hasPlaybook,
  hasAnalysis,
}: {
  projectId: string;
  hasPlaybook: boolean;
  hasAnalysis: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const generate = async () => {
    if (!hasAnalysis) {
      setToast({ message: "Add a summary via enrichment before generating a playbook.", type: "error" });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/playbook`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setToast({ message: hasPlaybook ? "Playbook regenerated" : "Playbook generated", type: "success" });
      router.refresh();
    } catch {
      setToast({ message: "Could not generate playbook", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {hasPlaybook ? (
        <SecondaryButton onClick={generate} disabled={loading || !hasAnalysis}>
          {loading ? "Regenerating..." : "Regenerate"}
        </SecondaryButton>
      ) : (
        <PrimaryButton onClick={generate} disabled={loading || !hasAnalysis}>
          {loading ? "Generating..." : "Generate Playbook"}
        </PrimaryButton>
      )}
      <p className="text-[11px] text-slate-400">
        Uses your account analysis and represented project to craft personas & angles.
      </p>
      {!hasAnalysis ? <p className="text-[11px] text-amber-300">Add a summary (enrich from URL) before generating.</p> : null}
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
