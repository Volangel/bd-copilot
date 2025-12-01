"use client";

import { cn } from "@/components/ui/utils";
import { useState, ReactNode } from "react";

type Tab = { id: "overview" | "contacts" | "notes"; label: string };

const tabs: Tab[] = [
  { id: "overview", label: "Overview" },
  { id: "contacts", label: "Contacts & Outreach" },
  { id: "notes", label: "Notes & Activity" },
];

export function AccountTabs({
  overview,
  contacts,
  notes,
}: {
  overview: ReactNode;
  contacts: ReactNode;
  notes: ReactNode;
}) {
  const [active, setActive] = useState<Tab["id"]>("overview");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-[#232527]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "rounded-t-md px-4 py-2 text-sm font-semibold transition-all duration-150 ease-out",
              active === tab.id
                ? "bg-[#181A1C] text-white"
                : "text-slate-400 hover:bg-[#1E2022] hover:text-slate-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {active === "overview" ? overview : null}
        {active === "contacts" ? contacts : null}
        {active === "notes" ? notes : null}
      </div>
    </div>
  );
}
