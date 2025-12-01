import Link from "next/link";
import { cn } from "./utils";

export type AppMode = "discover" | "pipeline" | "execute" | "other";

export type NavGroup = {
  label: string;
  mode: AppMode;
  items: { href: string; label: string }[];
};

export function SidebarNav({ groups, className }: { groups: NavGroup[]; className?: string }) {
  return (
    <nav className={cn("space-y-6 text-sm", className)}>
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <Link
                key={`${group.label}-${item.href}-${item.label}`}
                href={item.href}
                className="block rounded-md px-3 py-2 text-slate-200 transition hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
