import type { SelectHTMLAttributes } from "react";
import { cn } from "./utils";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      {...rest}
      className={cn(
        "w-full rounded-md border border-[#232527] bg-[#181A1C] px-3 py-2 text-sm text-slate-100 transition-all duration-150 ease-out focus:border-[#6366F1] focus:outline-none",
        className,
      )}
    >
      {children}
    </select>
  );
}
