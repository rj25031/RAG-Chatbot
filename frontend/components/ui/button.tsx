import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-spruce text-white hover:bg-spruce/90",
        variant === "secondary" && "bg-ochre text-white hover:bg-ochre/90",
        variant === "ghost" && "bg-white/60 text-ink hover:bg-white",
        className,
      )}
      {...props}
    />
  );
}

