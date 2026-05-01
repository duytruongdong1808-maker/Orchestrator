import { BrainCircuit, Code2, GitPullRequest } from "lucide-react";
import type { Mode } from "../../api";
import { cn } from "../../lib/utils";

const modes: Array<{ value: Mode; label: string; detail: string; icon: typeof BrainCircuit }> = [
  { value: "full", label: "Full fix", detail: "Plan, patch, review, verify", icon: GitPullRequest },
  { value: "codex", label: "Codex patch", detail: "Fast implementation pass", icon: Code2 },
  { value: "review", label: "Review diff", detail: "Inspect current dirty tree", icon: BrainCircuit }
];

export function ModeSelector({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Repair Mode</span>
        <div className="h-px flex-1 bg-border/70" />
      </div>
      <div className="space-y-1.5">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.value}
              onClick={() => onChange(mode.value)}
              className={cn(
                "relative flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
                value === mode.value ? "border-primary/50 bg-primary/10 shadow-sm shadow-primary/10 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-r before:bg-primary" : "bg-background/40 hover:bg-muted/70"
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-card/90">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{mode.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{mode.detail}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
