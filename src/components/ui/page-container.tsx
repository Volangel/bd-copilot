import type { ReactNode } from "react";
import { cn } from "./utils";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-6xl flex-col gap-8 px-8 py-10 md:py-12 lg:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
