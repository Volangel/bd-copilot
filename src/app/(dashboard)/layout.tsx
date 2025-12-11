import { LogoutButton } from "@/components/logout-button";
import { Icons, type NavGroup } from "@/components/ui/sidebar-nav";
import { SidebarClient } from "@/components/ui/sidebar-client";
import { PageContainer } from "@/components/ui/page-container";
import { MobileNavDrawer } from "@/components/ui/mobile-nav-drawer";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const navGroups: NavGroup[] = [
  {
    label: "Discover",
    mode: "discover",
    items: [
      {
        href: "/radar",
        label: "Radar",
        badge: "Live",
        icon: Icons.radar,
        description: "Signal dashboard with ecosystem alerts tuned to your org.",
        shortcut: "⌘1",
      },
      {
        href: "/leads/review",
        label: "Lead Review",
        icon: Icons.leads,
        description: "AI-first triage that scores inbound opportunities instantly.",
        shortcut: "⌘2",
      },
      {
        href: "/discover/scan",
        label: "Scan & Discover",
        badge: "Beta",
        icon: Icons.scan,
        description: "Deep reconnaissance across chains, teams, and key milestones.",
      },
      {
        href: "/settings/watchlist",
        label: "Watchlist",
        icon: Icons.watchlist,
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
        icon: Icons.accounts,
        description: "Single source of truth with context-aware profiles.",
        shortcut: "⌘3",
      },
      {
        href: "/projects/board",
        label: "Board",
        icon: Icons.board,
        description: "Kanban flow with focus lanes, SLAs, and momentum cues.",
        shortcut: "⌘4",
      },
      {
        href: "/projects/import",
        label: "Import",
        icon: Icons.import,
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
        icon: Icons.session,
        description: "Guided work sprints with AI copiloting and timers.",
        shortcut: "⌘5",
      },
      {
        href: "/tools/quick-capture",
        label: "Quick Capture",
        icon: Icons.capture,
        description: "Drop in thoughts, calls, and intel without breaking focus.",
        shortcut: "⌘Q",
      },
    ],
  },
  {
    label: "Resources",
    mode: "other",
    defaultCollapsed: true,
    items: [
      {
        href: "/settings/playbooks",
        label: "Playbooks",
        icon: Icons.playbooks,
        description: "Reusable operating rituals with embedded AI actions.",
      },
      {
        href: "/templates",
        label: "Templates",
        icon: Icons.templates,
        description: "Ready-to-run cadences, briefs, and follow-up frameworks.",
      },
    ],
  },
  {
    label: "Settings",
    mode: "other",
    defaultCollapsed: true,
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: Icons.settings,
        description: "Team, auth, and integration controls in one place.",
      },
      {
        href: "/billing",
        label: "Billing",
        icon: Icons.billing,
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
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)]/95 lg:flex">
        {/* Header */}
        <div className="border-b border-white/5 px-4 py-4">
          <p className="text-sm font-semibold tracking-wide text-[var(--accent-primary)]">
            BD Copilot
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">AI-powered pipeline ops</p>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarClient navGroups={navGroups} />
        </div>

        {/* Footer with User Info */}
        <div className="border-t border-white/5 px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)]/20 text-xs font-semibold text-[var(--accent-primary)]">
              {session.user.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                {session.user.email}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)]">{session.user.plan}</p>
            </div>
          </div>
          <LogoutButton className="mt-2 w-full" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Mobile Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/95 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <MobileNavDrawer
              navGroups={navGroups}
              user={{ email: session.user.email || "", plan: session.user.plan }}
            />
            <div>
              <p className="text-sm font-semibold text-[var(--accent-primary)]">BD Copilot</p>
            </div>
          </div>
          <LogoutButton />
        </div>

        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}
