"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import CommandPalette from "@/components/command-palette";
import ActionDock from "@/components/ui/action-dock";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <CommandPalette />
      <ActionDock />
    </SessionProvider>
  );
}
