"use client";

import { useEffect, useState } from "react";

export type ToastProps = { message: string | null; type?: "success" | "error"; onClear?: () => void };

export function Toast({ message, type = "success", onClear }: ToastProps) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (message) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        onClear?.();
      }, 2800);
      return () => clearTimeout(t);
    }
  }, [message, onClear]);
  if (!visible || !message) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm shadow-lg ${
        type === "error" ? "bg-red-600/80 text-white" : "bg-emerald-600/80 text-white"
      }`}
    >
      {message}
    </div>
  );
}
