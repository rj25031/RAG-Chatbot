import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A reusable rounded surface used for settings sections, metadata panels and
 * document cards. Mirrors the visual language used across the app.
 */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}