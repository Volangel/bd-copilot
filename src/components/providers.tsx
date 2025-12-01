"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import CommandPalette from "@/components/command-palette";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <CommandPalette />
    </SessionProvider>
  );
}
