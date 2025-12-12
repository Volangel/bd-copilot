import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import BillingActions from "./pricing-actions";

export default async function BillingPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription and upgrade for more automation."
        mode="other"
      />

      {searchParams.status === "success" ? (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Payment confirmed. Your plan will update shortly.
        </div>
      ) : null}

      {/* Current plan info card */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 ring-1 ring-purple-500/30">
              <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current plan</p>
              <p className="text-2xl font-semibold text-white">{session.user.plan}</p>
              <p className="text-sm text-slate-400">Includes core CRM, ICP scoring, and outreach mocks.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing options */}
      <div className="grid gap-4 md:grid-cols-3">
        <BillingActions currentPlan={session.user.plan} />
      </div>
    </div>
  );
}
