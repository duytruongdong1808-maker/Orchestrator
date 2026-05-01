import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "../ui/badge";

export function TestResultPanel({ output, exitCode }: { output?: string; exitCode?: number | null }) {
  if (!output) {
    return <div className="rounded-lg border bg-background/45 p-4 font-mono text-xs text-muted-foreground">No verifier was run.</div>;
  }

  const passed = exitCode === 0;
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
          Test result
        </div>
        <Badge tone={passed ? "good" : "bad"}>exit {exitCode ?? "unknown"}</Badge>
      </div>
      <pre className="min-h-0 overflow-auto rounded-lg border bg-background/85 p-3 font-mono text-xs leading-5 text-muted-foreground shadow-inner">
        {output}
      </pre>
    </div>
  );
}
