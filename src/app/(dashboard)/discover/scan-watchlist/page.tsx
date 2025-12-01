import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { WatchlistScanButton } from "@/components/watchlist-scan-button";
import { PageHeader } from "@/components/ui/header";

export default async function ScanWatchlistPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-4">
      <PageHeader title="Scan Watchlist" description="Run scans against your saved watchlist URLs." mode="discover" />
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm text-slate-300">Click to scan all watchlist URLs and push results to Radar.</p>
        <div className="mt-3">
          <WatchlistScanButton />
        </div>
      </div>
    </div>
  );
}
