import type { ReactNode } from "react";
import { cn } from "./utils";

export function FormField({
  label,
  children,
  helper,
  className,
}: {
  label: string;
  children: ReactNode;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-sm font-medium text-slate-800">{label}</label>
      {children}
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}
