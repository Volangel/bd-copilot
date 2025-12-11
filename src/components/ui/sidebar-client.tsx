"use client";

import { usePathname } from "next/navigation";
import { ModeSelector } from "./mode-selector";
import {
  SidebarNav,
  TodayHero,
  QuickCommandTrigger,
  type NavGroup,
} from "./sidebar-nav";

interface SidebarClientProps {
  navGroups: NavGroup[];
}

export function SidebarClient({ navGroups }: SidebarClientProps) {
  const pathname = usePathname();
  const isTodayActive = pathname === "/today";

  return (
    <div className="space-y-4">
      {/* Quick Command */}
      <QuickCommandTrigger />

      {/* Today Hero */}
      <TodayHero href="/today" isActive={isTodayActive} />

      {/* Mode Selector */}
      <ModeSelector />

      {/* Main Navigation */}
      <SidebarNav groups={navGroups} />
    </div>
  );
}
