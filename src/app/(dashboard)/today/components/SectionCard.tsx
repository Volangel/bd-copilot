import type { ReactNode } from "react";

export function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{title}</p>
          {description ? <p className="text-sm text-slate-400">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
