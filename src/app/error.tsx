"use client";

import Link from "next/link";

export default function GlobalError() {
  return (
    <html>
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <h2 className="text-xl font-semibold text-white">Something went wrong.</h2>
          <p className="text-sm text-slate-400">Try refreshing or go back to projects.</p>
          <Link href="/projects" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
            Back to Projects
          </Link>
        </div>
      </body>
    </html>
  );
}
