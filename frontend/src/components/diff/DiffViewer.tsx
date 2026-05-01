import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

type DiffRow = {
  text: string;
  kind: "add" | "remove" | "hunk" | "file" | "meta" | "context";
  oldNumber?: number;
  newNumber?: number;
};

function parseHunkStart(line: string) {
  const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (!match) return undefined;
  return { oldLine: Number(match[1]), newLine: Number(match[2]) };
}

function parseDiff(diff: string): DiffRow[] {
  let oldLine = 0;
  let newLine = 0;

  return diff.split("\n").map((line) => {
    const hunk = parseHunkStart(line);
    if (hunk) {
      oldLine = hunk.oldLine;
      newLine = hunk.newLine;
      return { text: line, kind: "hunk" };
    }

    if (line.startsWith("diff --git")) return { text: line, kind: "file" };
    if (line.startsWith("index ") || line.startsWith("+++") || line.startsWith("---")) return { text: line, kind: "meta" };
    if (line.startsWith("\\ ") || line.startsWith("Binary files ")) return { text: line, kind: "meta" };

    if (line.startsWith("+")) {
      const row = { text: line, kind: "add" as const, newNumber: newLine };
      newLine += 1;
      return row;
    }

    if (line.startsWith("-")) {
      const row = { text: line, kind: "remove" as const, oldNumber: oldLine };
      oldLine += 1;
      return row;
    }

    const row = oldLine || newLine ? { text: line, kind: "context" as const, oldNumber: oldLine, newNumber: newLine } : { text: line, kind: "context" as const };
    if (oldLine || newLine) {
      oldLine += 1;
      newLine += 1;
    }
    return row;
  });
}

export function DiffViewer({ diff }: { diff?: string }) {
  const [wrap, setWrap] = useState(false);
  const rows = useMemo(() => (diff ? parseDiff(diff) : []), [diff]);

  if (!diff?.trim()) {
    return <div className="rounded-lg border bg-background/45 p-4 font-mono text-xs text-muted-foreground">No diff to display.</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-background/90 shadow-inner">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <span className="font-mono text-[11px] text-muted-foreground">{rows.length} lines</span>
        <Button variant="ghost" size="sm" className="h-7 font-mono text-[11px]" onClick={() => setWrap((value) => !value)}>
          {wrap ? "No wrap" : "Wrap"}
        </Button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5">
        <code className={cn("block min-w-full", wrap ? "w-full" : "w-max")}>
          {rows.map((row, index) => (
            <span
              key={index}
              className={cn(
                "grid min-w-full grid-cols-[3.25rem_3.25rem_minmax(0,1fr)] border-b border-border/25",
                row.kind === "add" && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                row.kind === "remove" && "bg-red-500/10 text-red-800 dark:text-red-200",
                row.kind === "hunk" && "bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
                row.kind === "file" && "bg-primary/10 text-primary",
                row.kind === "meta" && "text-muted-foreground"
              )}
            >
              <span className="select-none border-r bg-muted/20 px-2 text-right text-muted-foreground">{row.oldNumber ?? ""}</span>
              <span className="select-none border-r bg-muted/20 px-2 text-right text-muted-foreground">{row.newNumber ?? ""}</span>
              <span className={cn("px-3", wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre")}>{row.text || " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
