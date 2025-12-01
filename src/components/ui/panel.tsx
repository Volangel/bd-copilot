import type { ReactNode } from "react";
import { cn } from "./utils";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#232527] bg-[#0E0F10] p-6 shadow-sm transition-all duration-150 ease-out hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
