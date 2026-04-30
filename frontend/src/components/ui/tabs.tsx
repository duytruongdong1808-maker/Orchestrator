import * as React from "react";
import { cn } from "../../lib/utils";

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex h-full min-h-0 flex-col", className)} {...props} />;
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid rounded-md border bg-muted p-1", className)} {...props} />;
}

export function TabsTrigger({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "rounded px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
        active && "bg-card text-foreground shadow-sm",
        className
      )}
      {...props}
    />
  );
}
