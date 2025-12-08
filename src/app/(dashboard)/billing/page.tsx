import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import BillingActions from "./pricing-actions";

export default async function BillingPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="text-sm text-slate-400">Manage your subscription and upgrade for more automation.</p>
      </div>
      {searchParams.status === "success" ? (
        <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Payment confirmed. Your plan will update shortly.
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <p className="text-xs uppercase text-slate-400">Current plan</p>
          <p className="text-2xl font-semibold text-white">{session.user.plan}</p>
          <p className="text-sm text-slate-400">Includes core CRM, ICP scoring, and outreach mocks.</p>
        </div>
        <BillingActions currentPlan={session.user.plan} />
      </div>
    </>
  );
}
