"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
    >
      Logout
    </button>
  );
}
