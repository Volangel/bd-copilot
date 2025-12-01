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
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <aside className="hidden w-[17rem] flex-col justify-between border-r border-[var(--border-default)] bg-[var(--bg-secondary)]/90 px-7 py-9 lg:flex">
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">Web3 BD Copilot</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">AI-powered pipeline ops</p>
          </div>
          <ModeSelector />
          <SidebarNav groups={navGroups} />
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-3 shadow-lg shadow-black/20">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{session.user.email}</p>
            <p className="text-xs text-[var(--text-secondary)]">Plan: {session.user.plan}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-4 lg:hidden shadow-md shadow-black/20">
          <div>
            <p className="text-sm font-semibold text-[var(--accent-primary)]">Web3 BD Copilot</p>
            <p className="text-xs text-[var(--text-secondary)]">Plan: {session.user.plan}</p>
          </div>
          <LogoutButton />
        </div>
        <div className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-4 lg:hidden">
          <ModeSelector />
          <SidebarNav groups={navGroups} />
        </div>
        <PageContainer className="lg:py-10">{children}</PageContainer>
      </div>
    </div>
  );
}
