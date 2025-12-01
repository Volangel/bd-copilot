import ScannerClient from "@/components/discovery/scanner-client";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/header";

export default async function DiscoverScanPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discovery Scanner"
        description="Paste text or a URL to find Web3 opportunities. Results appear in the Discovery Feed."
        mode="discover"
      />
      <ScannerClient />
    </div>
  );
}
