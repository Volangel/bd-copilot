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
    items: [
      {
        href: "/today",
        label: "Today",
        description: "Curated agenda, priorities, and blockers in one glance.",
      },
    ],
  },
  {
    label: "Discover",
    mode: "discover",
    items: [
      {
        href: "/radar",
        label: "Radar",
        badge: "Live",
        description: "Signal dashboard with ecosystem alerts tuned to your org.",
      },
      {
        href: "/leads/review",
        label: "Lead Review",
        description: "AI-first triage that scores inbound opportunities instantly.",
      },
      {
        href: "/discover/scan",
        label: "Scan & Discover",
        badge: "Beta",
        description: "Deep reconnaissance across chains, teams, and key milestones.",
      },
      {
        href: "/settings/watchlist",
        label: "Watchlist",
        description: "Follow high-intent projects with health metrics and nudges.",
      },
    ],
  },
  {
    label: "Pipeline",
    mode: "pipeline",
    items: [
      {
        href: "/projects",
        label: "Accounts",
        description: "Single source of truth with context-aware profiles.",
      },
      {
        href: "/projects/board",
        label: "Board",
        description: "Kanban flow with focus lanes, SLAs, and momentum cues.",
      },
      {
        href: "/projects/import",
        label: "Import Projects",
        description: "Fast CSV & API imports with smart field mapping.",
      },
    ],
  },
  {
    label: "Execute",
    mode: "execute",
    items: [
      {
        href: "/session",
        label: "Session Mode",
        description: "Guided work sprints with AI copiloting and timers.",
      },
      {
        href: "/tools/quick-capture",
        label: "Quick Capture",
        description: "Drop in thoughts, calls, and intel without breaking focus.",
      },
    ],
  },
  {
    label: "Playbooks",
    mode: "other",
    items: [
      {
        href: "/settings/playbooks",
        label: "Playbooks",
        description: "Reusable operating rituals with embedded AI actions.",
      },
      {
        href: "/templates",
        label: "Templates",
        description: "Ready-to-run cadences, briefs, and follow-up frameworks.",
      },
    ],
  },
  {
    label: "Settings",
    mode: "other",
    items: [
      {
        href: "/settings",
        label: "Settings",
        description: "Team, auth, and integration controls in one place.",
      },
      {
        href: "/billing",
        label: "Billing",
        description: "Manage seats, usage, and plan details with transparency.",
      },
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
      <aside className="hidden w-[17rem] flex-col justify-between border-r border-[var(--border-default)] bg-[var(--bg-secondary)]/90 px-7 py-9 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex">
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-primary)]">Web3 BD Copilot</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">AI-powered pipeline ops</p>
          </div>
          <ModeSelector />
          <SidebarNav groups={navGroups} />
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-elevated)]/90 px-3 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{session.user.email}</p>
            <p className="text-xs text-[var(--text-secondary)]">Plan: {session.user.plan}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/95 px-5 py-4 shadow-md shadow-black/25 backdrop-blur lg:hidden">
          <div>
            <p className="text-sm font-semibold text-[var(--accent-primary)]">Web3 BD Copilot</p>
            <p className="text-xs text-[var(--text-secondary)]">Plan: {session.user.plan}</p>
          </div>
          <LogoutButton />
        </div>
        <div className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/95 px-5 py-4 backdrop-blur lg:hidden">
          <ModeSelector />
          <SidebarNav groups={navGroups} />
        </div>
        <PageContainer className="lg:py-10">{children}</PageContainer>
      </div>
    </div>
  );
}
