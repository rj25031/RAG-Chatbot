import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Small uppercase tracking label used for section eyebrows throughout the UI.
 */
export function SectionLabel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-[10px] uppercase tracking-[0.28em] text-black/45 sm:text-xs",
        className,
      )}
    >
      {children}
    </p>
  );
}