import { cn } from "./utils";
import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-md border border-[#232527] bg-[#181A1C] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-150 ease-out focus:border-[#6366F1] focus:outline-none",
        className,
      )}
    />
  );
}
