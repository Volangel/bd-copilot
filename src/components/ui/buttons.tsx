import { cn } from "./utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

const base =
  "inline-flex items-center justify-center rounded-md border text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60";

export function PrimaryButton({ className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "border-[#00D9A3] bg-[#00D9A3] px-4 py-2 text-white shadow-lg shadow-emerald-500/30 hover:bg-[#05c795] focus-visible:outline-[#00D9A3]",
        className,
      )}
    />
  );
}

export function SecondaryButton({ className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "border-[#00D9A3] bg-transparent px-4 py-2 text-[#00D9A3] hover:bg-[#0F1012] focus-visible:outline-[#00D9A3]",
        className,
      )}
    />
  );
}

export function GhostButton({ className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "border-transparent bg-transparent px-3 py-2 text-slate-200 hover:bg-white/5 focus-visible:outline-slate-400",
        className,
      )}
    />
  );
}

export function IconButton({ className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-[#0F1012] text-slate-200 hover:bg-white/10",
        className,
      )}
    />
  );
}
