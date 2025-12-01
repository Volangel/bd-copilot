import { LogoutButton } from "@/components/logout-button";
import { SidebarNav, type NavGroup } from "@/components/ui/sidebar-nav";
import { PageContainer } from "@/components/ui/page-container";
import { ModeSelector } from "@/components/ui/mode-selector";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const navGroups: NavGroup[] = [
  {
    label: "Today",
    mode: "other",
    items: [{ href: "/today", label: "Today" }],
  },
  {
    label: "Discover",
    mode: "discover",
    items: [
      { href: "/radar", label: "Radar" },
      { href: "/leads/review", label: "Lead Review" },
      { href: "/discover/scan", label: "Scan & Discover" },
      { href: "/settings/watchlist", label: "Watchlist" },
    ],
  },
  {
    label: "Pipeline",
    mode: "pipeline",
    items: [
      { href: "/projects", label: "Accounts" },
      { href: "/projects/board", label: "Board" },
      { href: "/projects/import", label: "Import Projects" },
    ],
  },
  {
    label: "Execute",
    mode: "execute",
    items: [
      { href: "/session", label: "Session Mode" },
      { href: "/tools/quick-capture", label: "Quick Capture" },
    ],
  },
  {
    label: "Playbooks",
    mode: "other",
    items: [
      { href: "/settings/playbooks", label: "Playbooks" },
      { href: "/templates", label: "Templates" },
    ],
  },
  {
    label: "Settings",
    mode: "other",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/billing", label: "Billing" },
    ],
  },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-64 flex-col justify-between border-r border-slate-800 bg-slate-900/60 px-6 py-8 lg:flex">
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Web3 BD Copilot</p>
            <p className="mt-1 text-xs text-slate-400">AI-powered pipeline ops</p>
          </div>
          <ModeSelector />
          <SidebarNav groups={navGroups} />
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-3">
            <p className="text-sm font-semibold text-white">{session.user.email}</p>
            <p className="text-xs text-slate-400">Plan: {session.user.plan}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold text-emerald-300">Web3 BD Copilot</p>
            <p className="text-xs text-slate-400">Plan: {session.user.plan}</p>
          </div>
          <LogoutButton />
        </div>
        <div className="border-b border-slate-800 bg-slate-900 px-4 py-3 lg:hidden">
          <ModeSelector />
          <SidebarNav groups={navGroups} />
        </div>
        <PageContainer className="lg:py-8 text-slate-100">{children}</PageContainer>
      </div>
    </div>
  );
}
