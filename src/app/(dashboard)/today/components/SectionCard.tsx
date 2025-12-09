import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

export function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="space-y-3 border-white/10 bg-[color:var(--pipeline-panel,_#0F1012)] px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base font-semibold text-white">{title}</p>
          {description ? <p className="text-sm text-[var(--text-tertiary)]">{description}</p> : null}
        </div>
      </div>
      <div>{children}</div>
    </Card>
  );
}
