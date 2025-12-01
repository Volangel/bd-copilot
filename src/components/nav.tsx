"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function NavMenu({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800/60 ${
              active ? "bg-slate-800 text-white" : "text-slate-300"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
