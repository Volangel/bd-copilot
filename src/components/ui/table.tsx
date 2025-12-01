import { cn } from "./utils";
import type { ReactNode } from "react";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-white/10 bg-[#0F1012] shadow-md shadow-black/10", className)}>
      <table className="w-full border-collapse text-left text-sm text-slate-100">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">{children}</thead>;
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("border-t border-white/5 hover:bg-white/5 transition-colors duration-200", className)}>{children}</tr>;
}
