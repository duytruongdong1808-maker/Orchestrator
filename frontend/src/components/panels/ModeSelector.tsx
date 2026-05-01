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
      <div className="font-mono text-[11px] font-semibold uppercase text-muted-foreground">Repair Mode</div>
      <div className="space-y-1.5">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.value}
              onClick={() => onChange(mode.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                value === mode.value ? "border-primary/60 bg-primary/10 shadow-sm shadow-primary/10" : "bg-background/40 hover:bg-muted/70"
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-card/90">
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
