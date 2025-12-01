import { cn } from "./utils";
import type { ReactNode } from "react";

export function Dropdown({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md border border-[#232527] bg-[#181A1C] p-2 shadow-lg", className)}>
      {children}
    </div>
  );
}
