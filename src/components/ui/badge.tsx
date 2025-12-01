import { cn } from "./utils";

type Variant = "primary" | "outline" | "success" | "warning" | "danger" | "neutral" | "info";

const variantMap: Record<Variant, string> = {
  primary: "border-[#00D9A3] bg-[#0F1012] text-[#00D9A3]",
  outline: "border-white/15 bg-transparent text-slate-200",
  success: "border-[#00D9A3] bg-[#0F2C24] text-[#00D9A3]",
  warning: "border-[#FBBF24] bg-[#2E260E] text-[#FBBF24]",
  danger: "border-[#EF4444] bg-[#2D1111] text-[#FCA5A5]",
  neutral: "border-white/10 bg-[#0F1012] text-slate-200",
  info: "border-[#2563EB] bg-[#111827] text-[#93C5FD]",
};

export function Badge({ children, variant = "neutral", className }: { children: React.ReactNode; variant?: Variant; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ease-out",
        variantMap[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TagPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700", className)}>
      {children}
    </span>
  );
}
