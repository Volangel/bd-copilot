import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0C0E] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12 md:flex-row md:items-center md:gap-10">
        <div className="mb-10 md:mb-0 md:w-1/2 space-y-3">
          <p className="text-sm font-semibold text-emerald-300">Web3 BD Copilot</p>
          <h1 className="text-3xl font-semibold text-white">AI-powered pipeline OS for Web3 business development</h1>
          <p className="text-sm text-slate-400">
            Analyze projects, prioritize outreach, and run BD loops faster with sequences and session mode.
          </p>
        </div>
        <div className="flex w-full justify-center md:w-1/2">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111214] px-8 py-8 shadow-lg shadow-black/30">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
