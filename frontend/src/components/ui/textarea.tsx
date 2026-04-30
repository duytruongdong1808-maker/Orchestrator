import * as React from "react";
import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-none rounded-md border bg-background px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary",
        className
      )}
      {...props}
    />
  );
}
