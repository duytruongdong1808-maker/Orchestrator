import { Badge } from "../ui/badge";
import type { CliStatus } from "../../api";

export function CliStatusPanel({ status }: { status?: CliStatus }) {
  const items = [
    ["Codex", status?.codex?.ok],
    ["Planner", status?.claude?.ok],
    ["Git", status?.git?.ok],
    ["Node", status?.node?.ok]
  ] as const;

  return (
    <section className="space-y-2">
      <div className="font-mono text-[11px] font-semibold uppercase text-muted-foreground">Toolchain</div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(([label, ok]) => (
          <Badge key={label} tone={ok === undefined ? "neutral" : ok ? "good" : "bad"} className="justify-between gap-2 py-1.5">
            <span>{label}</span>
            <span>{ok === undefined ? "unknown" : ok ? "ready" : "missing"}</span>
          </Badge>
        ))}
      </div>
    </section>
  );
}
