import { Check, Circle, Loader2, X } from "lucide-react";
import { cn } from "../../lib/utils";

export type TimelineStep = {
  label: string;
  status: "pending" | "running" | "complete" | "failed";
};

const icons = {
  pending: Circle,
  running: Loader2,
  complete: Check,
  failed: X
};

export function AgentTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-lg border bg-muted/35 p-1.5">
      {steps.map((step) => {
        const Icon = icons[step.status];
        return (
          <div
            key={step.label}
            className={cn(
              "flex min-w-28 flex-1 items-center gap-2 rounded-md border border-transparent px-2.5 py-2 transition",
              step.status === "running" && "border-primary/35 bg-primary/10",
              step.status === "complete" && "bg-card",
              step.status === "failed" && "border-red-500/30 bg-red-500/10"
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                step.status === "running" && "animate-spin text-primary",
                step.status === "complete" && "text-emerald-600",
                step.status === "failed" && "text-red-600",
                step.status === "pending" && "text-muted-foreground"
              )}
            />
            <span className="truncate text-xs font-medium text-muted-foreground">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
