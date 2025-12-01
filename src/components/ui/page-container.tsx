import type { ReactNode } from "react";
import { cn } from "./utils";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-6xl px-4 py-6", className)}>{children}</div>;
}
