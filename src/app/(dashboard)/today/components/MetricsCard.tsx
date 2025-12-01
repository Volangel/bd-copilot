type MetricsCardProps = {
  title: string;
  value: number | string;
  helper?: string;
  accent?: "neutral" | "warning" | "danger" | "success";
};

const accentMap: Record<NonNullable<MetricsCardProps["accent"]>, string> = {
  neutral: "border-white/5",
  warning: "border-amber-400/60",
  danger: "border-red-500/60",
  success: "border-emerald-400/60",
};

export function MetricsCard({ title, value, helper, accent = "neutral" }: MetricsCardProps) {
  return (
    <div
      className={`rounded-xl border ${accentMap[accent]} bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20 transition duration-150 hover:-translate-y-[1px] hover:border-white/20`}
    >
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}
