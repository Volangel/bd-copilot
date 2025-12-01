"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full rounded-lg border border-slate-800 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
    >
      Logout
    </button>
  );
}
