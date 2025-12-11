"use client";

import { signOut } from "next-auth/react";
import { cn } from "./ui/utils";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn(
        "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-[13px] text-[var(--text-secondary)] transition hover:border-white/15 hover:bg-white/10 hover:text-[var(--text-primary)]",
        className,
      )}
    >
      Sign out
    </button>
  );
}
