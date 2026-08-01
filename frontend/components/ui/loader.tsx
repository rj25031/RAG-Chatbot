import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

const spinnerSizes: Record<SpinnerSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

export function Spinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: SpinnerSize;
}) {
  return (
    <Loader2
      className={cn("animate-spin", spinnerSizes[size], className)}
      aria-hidden
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-black/[0.06]",
        className,
      )}
      aria-hidden
    />
  );
}

export function PageLoader({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[100dvh] w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top_left,_rgba(118,153,136,0.18),_transparent_24%),linear-gradient(180deg,_#f6f7f8_0%,_#eceff1_100%)] text-ink",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#171717] text-white shadow-lg">
        <Spinner size="md" className="text-white" />
      </div>
      <p className="text-sm font-medium text-black/55">{label}</p>
    </div>
  );
}

export function SectionLoader({
  label = "Loading...",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "px-4 py-8" : "min-h-[240px] flex-1 px-4 py-12",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-white text-[#173d31] shadow-sm ring-1 ring-black/5",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <Spinner size={compact ? "sm" : "md"} className="text-[#2f6d57]" />
      </div>
      <p className="text-sm text-black/55">{label}</p>
    </div>
  );
}

export function InlineLoader({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-sm text-black/55", className)}
      role="status"
      aria-live="polite"
    >
      <Spinner size="sm" className="text-[#2f6d57]" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            "rounded-2xl border border-black/6 bg-white/80 p-4 sm:rounded-[28px] sm:p-5",
            index % 2 === 1 && "bg-transparent border-0",
          )}
        >
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[92%]" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-black/8 bg-[#f7f7f8] px-3 py-3 sm:rounded-3xl sm:px-4 sm:py-4"
        >
          <Skeleton className="h-3.5 w-[80%]" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DocumentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-black/8 bg-white p-3 sm:rounded-3xl sm:p-4 lg:px-4 lg:py-3"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FolderTreeSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-2xl border border-black/8 bg-white px-2.5 py-2"
          style={{ marginLeft: `${(index % 3) * 12}px` }}
        >
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-[70%]" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-black/8 bg-white p-3 sm:rounded-[24px] sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-9 w-9 rounded-2xl" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-[70%]" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="grid gap-4 p-3 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <div className="space-y-4 sm:space-y-5">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="rounded-2xl border border-black/8 bg-white p-4 sm:rounded-[32px] sm:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
            <Skeleton className="mt-5 h-14 w-full rounded-3xl" />
          </div>
        ))}
      </div>
      <div className="space-y-4 sm:space-y-5">
        <div className="rounded-2xl border border-black/8 bg-white p-4 sm:rounded-[32px] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function DocumentDetailSkeleton() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[#f7f7f8]" aria-busy="true">
      <div className="border-b border-black/8 bg-white px-3 py-4 sm:px-5 sm:py-5">
        <Skeleton className="mb-4 h-4 w-36" />
        <Skeleton className="h-7 w-[55%]" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-2xl border border-black/8 bg-white p-4 sm:rounded-[28px] sm:p-5">
          <Skeleton className="h-3 w-20" />
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-3xl" />
          ))}
        </div>
        <div className="space-y-3 rounded-2xl border border-black/8 bg-white p-4 sm:rounded-[28px] sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-[70%]" />
            </div>
          </div>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28 w-full rounded-[28px]" />
          ))}
        </div>
      </div>
    </section>
  );
}
