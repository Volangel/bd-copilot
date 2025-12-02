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
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <Link
                key={`${group.label}-${item.href}-${item.label}`}
                href={item.href}
                className="block rounded-xl border border-transparent px-3 py-2 text-[var(--text-secondary)] transition hover:-translate-y-[1px] hover:border-white/10 hover:bg-white/5 hover:text-[var(--text-primary)]"
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
