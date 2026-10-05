import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Leading icon + title + description block. Used at the top of settings
 * sections and detail panels.
 */
export function CardHeader({
  icon,
  iconClassName,
  title,
  description,
  className,
}: {
  icon?: ReactNode;
  iconClassName?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start gap-3 sm:items-center", className)}>
      {icon ? (
        <div className={cn("shrink-0 rounded-2xl bg-[#d8e4dc] p-2.5 text-[#173d31] sm:p-3", iconClassName)}>
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-ink sm:text-lg">{title}</h3>
        {description ? <p className="text-sm text-black/55">{description}</p> : null}
      </div>
    </div>
  );
}