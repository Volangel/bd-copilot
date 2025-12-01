import type { ReactNode } from "react";
import { cn } from "./utils";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-6xl px-6 py-8 md:px-10 lg:px-12", className)}>{children}</div>;
}
