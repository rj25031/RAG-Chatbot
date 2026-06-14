import * as React from "react";

import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none ring-0 placeholder:text-black/45 focus:border-spruce",
        props.className,
      )}
    />
  );
}

