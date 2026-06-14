import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-3xl border border-black/10 bg-white/85 px-4 py-3 text-sm outline-none placeholder:text-black/45 focus:border-spruce",
        props.className,
      )}
    />
  );
});
