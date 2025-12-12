import ScannerClient from "@/components/discovery/scanner-client";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";
import Link from "next/link";

export default async function DiscoverScanPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discovery Scanner"
        description="Paste text or a URL to find Web3 opportunities. Results appear in the Discovery Feed."
        mode="discover"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/discover/scan-watchlist"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Scan Watchlist
            </Link>
            <Link
              href="/radar"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Radar
            </Link>
          </div>
        }
      />

      {/* Scanner info card */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/30">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Discover opportunities</p>
            <p className="text-xs text-slate-400">Paste text, a URL, or use the bulk scanner to find new leads</p>
          </div>
        </div>
      </div>

      <ScannerClient />
    </div>
  );
}
