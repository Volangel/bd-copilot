import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type PipelineItem = {
  id: string;
  name?: string | null;
  url: string;
  hasOverdueSequenceStep: boolean;
  nextSequenceStepDueAt: Date | null;
};

export function TopPipelineList({ items }: { items: PipelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[color:var(--pipeline-panel,_#0F1012)] px-6 py-10 text-center text-slate-300">
        <div className="text-2xl">🧊</div>
        <p className="mt-2 text-base font-semibold text-white">No pipeline items yet</p>
        <p className="text-sm text-slate-400">Add projects or sequences to see your pipeline here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[color:var(--pipeline-panel,_#0F1012)] px-6 py-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-white">Top pipeline</p>
        <Link href="/projects" className="text-sm text-emerald-300 hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {items.slice(0, 5).map((p) => {
          const name = p.name || p.url;
          const next = p.nextSequenceStepDueAt ? formatDate(p.nextSequenceStepDueAt) : "No next touch";
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-3 text-sm text-slate-200 transition hover:border-white/15 hover:bg-white/10"
            >
              <div className="space-y-1">
                <p className="font-semibold text-white">{name}</p>
                <p className="text-xs text-slate-400">{p.url}</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs">
                {p.hasOverdueSequenceStep ? (
                  <Badge variant="danger">Overdue</Badge>
                ) : (
                  <Badge variant="info">{next}</Badge>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
