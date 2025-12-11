"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/components/ui/utils";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeVariant?: "default" | "warning" | "success";
}

interface WorkspaceTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function WorkspaceTabs({ tabs, defaultTab, onTabChange, className }: WorkspaceTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  // Sync with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabs.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, tabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);

    // Update URL without full reload
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={cn("flex items-center gap-1 rounded-xl bg-slate-900/50 p-1 border border-white/5", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5",
            )}
          >
            <span className="opacity-70">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  tab.badgeVariant === "warning"
                    ? "bg-amber-500/20 text-amber-400"
                    : tab.badgeVariant === "success"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700 text-slate-300",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Tab content wrapper for consistent styling
export function TabContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-4 space-y-4", className)}>{children}</div>;
}
