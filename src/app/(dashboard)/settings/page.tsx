import { SettingsForm, SettingsPayload } from "@/components/settings-form";
import { authOptions } from "@/lib/auth";
import { parseRepresentingProjectConfig } from "@/lib/user/types";
import { parseJsonString } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/header";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { icpProfile: true },
  });

  if (!user) redirect("/login");

  const initial: SettingsPayload = {
    industries: user.icpProfile?.industries || "",
    painPoints: user.icpProfile?.painPoints || "",
    filters: parseJsonString<Record<string, unknown>>(user.icpProfile?.filters, {}),
    aiVoice: parseJsonString<{ tone: string; length: string; formality: string }>(user.aiVoice, {
      tone: "practical",
      length: "short",
      formality: "casual",
    }),
    representingProject: parseRepresentingProjectConfig(user.representingProject),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Tune your ICP profile and outreach voice. Manage playbooks and watchlist for lead radar."
        mode="other"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/settings/playbooks"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Playbooks
            </Link>
            <Link
              href="/settings/watchlist"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Watchlist
            </Link>
          </div>
        }
      />

      {/* Quick links card */}
      <Card className="flex flex-col gap-4 overflow-hidden border-slate-400/20 bg-gradient-to-r from-slate-500/10 via-transparent to-transparent p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Quick settings</p>
          <p className="text-sm text-slate-300">Configure playbooks to prioritize leads, and manage watchlist URLs for automated scanning.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/playbooks"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New playbook
          </Link>
          <Link
            href="/settings/watchlist"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 transition hover:border-blue-400 hover:bg-blue-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add watchlist URL
          </Link>
        </div>
      </Card>

      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 ring-1 ring-slate-500/30">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white">Profile & Preferences</p>
            <p className="text-xs text-slate-500">Configure your ICP and AI voice settings</p>
          </div>
        </div>
        <SettingsForm initial={initial} />
      </Card>
      {process.env.NODE_ENV !== "production" ? (
        <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Dev: Set plan</p>
              <p className="text-xs text-slate-500">Use this to toggle plans for AI testing (local/dev only).</p>
            </div>
            <div className="text-xs text-slate-400">Current: {user.plan}</div>
          </div>
          <form
            action={async (formData) => {
              "use server";
              const sessionInner = await getServerSession(authOptions);
              if (!sessionInner) return;
              const plan = (formData.get("plan") as string) || "free";
              await prisma.user.update({ where: { id: sessionInner.user.id }, data: { plan } });
              const { revalidatePath } = await import("next/cache");
              revalidatePath("/settings");
            }}
            className="mt-3 flex flex-wrap items-center gap-2 text-sm"
          >
            <select name="plan" defaultValue={user.plan} className="rounded-md border border-white/10 bg-[#0B0C0E] px-3 py-2 text-sm text-white">
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button
              type="submit"
              className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
            >
              Update plan
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
