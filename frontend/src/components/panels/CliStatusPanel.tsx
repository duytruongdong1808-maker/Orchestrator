import type { CliStatus } from "../../api";
import { cn } from "../../lib/utils";

export function CliStatusPanel({ status }: { status?: CliStatus }) {
  const items = [
    ["Codex", status?.codex?.ok],
    ["Planner", status?.claude?.ok],
    ["Git", status?.git?.ok],
    ["Node", status?.node?.ok]
  ] as const;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Toolchain</span>
        <div className="h-px flex-1 bg-border/70" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(([label, ok]) => (
          <div key={label} className="flex items-center justify-between gap-2 rounded-md border bg-background/45 px-2 py-1.5">
            <span>{label}</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", ok === undefined ? "bg-muted-foreground/40" : ok ? "bg-emerald-500" : "bg-red-500")} />
              {ok === undefined ? "unknown" : ok ? "ready" : "missing"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
