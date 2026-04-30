import * as React from "react";
import { cn } from "../../lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "border-border bg-muted text-muted-foreground",
    good: "border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warn: "border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    bad: "border-red-300/60 bg-red-500/10 text-red-700 dark:text-red-300"
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}
      {...props}
    />
  );
}
