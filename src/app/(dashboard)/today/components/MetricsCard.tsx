import Link from "next/link";
import { Card } from "@/components/ui/card";

type MetricsCardProps = {
  title: string;
  value: number | string;
  helper?: string;
  accent?: "neutral" | "warning" | "danger" | "success";
  cta?: { label: string; href: string };
};

const accentMap: Record<NonNullable<MetricsCardProps["accent"]>, string> = {
  neutral: "from-white/10 to-white/0 text-white",
  warning: "from-amber-300/30 to-amber-500/10 text-amber-100",
  danger: "from-red-400/40 to-red-500/10 text-red-100",
  success: "from-emerald-300/30 to-emerald-500/10 text-emerald-100",
};

export function MetricsCard({ title, value, helper, accent = "neutral", cta }: MetricsCardProps) {
  return (
    <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-[#0F1116] to-[#0B0C10]">
      <div
        className={`pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-br ${accentMap[accent]} opacity-40 blur-3xl`}
        aria-hidden
      />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{title}</p>
            <div className="flex items-baseline gap-2">
              <div className="text-[30px] font-semibold leading-tight text-white">{value}</div>
            </div>
            {helper ? <p className="text-sm text-[var(--text-tertiary)]">{helper}</p> : null}
          </div>
          {cta ? (
            <Link
              href={cta.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
