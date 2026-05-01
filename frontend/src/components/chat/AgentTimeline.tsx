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
    <div className="flex min-w-0 items-center overflow-x-auto rounded-md border bg-muted/25 px-3 py-2">
      {steps.map((step, index) => {
        const Icon = icons[step.status];
        const isActive = step.status === "running";
        const connectorDone = steps.slice(0, index + 1).every((item) => item.status === "complete");
        return (
          <div key={step.label} className="flex min-w-24 flex-1 items-center">
            <div className="flex min-w-0 items-center gap-2" aria-current={isActive ? "step" : undefined}>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background",
                  isActive && "h-7 w-7 border-primary bg-primary/10",
                  step.status === "complete" && "border-emerald-500/60 bg-emerald-500/10",
                  step.status === "failed" && "border-red-500/60 bg-red-500/10"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    isActive && "animate-spin text-primary",
                    step.status === "complete" && "text-emerald-500",
                    step.status === "failed" && "text-red-500",
                    step.status === "pending" && "text-muted-foreground"
                  )}
                />
              </span>
              <span className={cn("truncate font-mono text-[11px] font-medium", step.status === "pending" ? "text-muted-foreground" : "text-foreground")}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? <div className={cn("mx-2 h-px min-w-6 flex-1", connectorDone ? "bg-primary/70" : "bg-border")} /> : null}
          </div>
        );
      })}
    </div>
  );
}
