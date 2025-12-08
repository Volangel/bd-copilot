import { SettingsForm, SettingsPayload } from "@/components/settings-form";
import { authOptions } from "@/lib/auth";
import { parseRepresentingProjectConfig } from "@/lib/user/types";
import { parseJsonString } from "@/lib/parsers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";

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
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate-400">
          Tune your ICP profile and outreach voice. Manage playbooks and watchlist for lead radar.
        </p>
        <div className="mt-2 flex gap-2 text-xs">
          <a className="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200 hover:border-white/20" href="/settings/playbooks">
            Playbooks
          </a>
          <a className="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200 hover:border-white/20" href="/settings/watchlist">
            Watchlist
          </a>
        </div>
      </div>
      <Card className="rounded-xl border border-white/10 bg-[#0F1012] px-6 py-5 shadow-lg shadow-black/20">
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
    </>
  );
}
