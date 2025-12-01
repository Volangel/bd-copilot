import { cn } from "./utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

const base =
  "inline-flex items-center justify-center rounded-lg border text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60";

export function PrimaryButton({ className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "border-[var(--accent-primary)] bg-[var(--accent-primary)] px-5 py-[10px] text-[var(--bg-primary)] shadow-[0_0_20px_rgba(0,217,163,0.3)] hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-[var(--accent-primary)]",
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
        "border-[var(--accent-primary)] bg-transparent px-5 py-[10px] text-[var(--accent-primary)] hover:bg-[rgba(0,217,163,0.1)] active:scale-[0.98] focus-visible:outline-[var(--accent-primary)]",
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
        "border-transparent bg-transparent px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] focus-visible:outline-[var(--border-strong)]",
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
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
        className,
      )}
    />
  );
}
