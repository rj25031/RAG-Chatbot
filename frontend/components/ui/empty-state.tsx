import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Dashed-border callout for "no items yet" / empty collection states.
 * Repeated across folders, documents, citations and conversations.
 */
export function EmptyState({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-black/55 sm:rounded-3xl sm:px-5 sm:py-6",
        className,
      )}
    >
      {children}
    </div>
  );
}