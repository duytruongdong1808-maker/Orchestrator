import { CheckCircle2, Copy, Loader2, Terminal, XCircle } from "lucide-react";
import type { AgentRun, TerminalEvent } from "../../api";
import { cn } from "../../lib/utils";

type TranscriptStatus = "running" | "complete" | "failed";

export type TranscriptRun = {
  id: string;
  agentName: string;
  phase: string;
  command: string;
  args: string[];
  cwd?: string;
  prompt: string;
  output: string;
  exitCode: number | null;
  durationMs?: number;
  status: TranscriptStatus;
};

function quoteArg(arg: string) {
  return /\s/.test(arg) ? JSON.stringify(arg) : arg;
}

function commandLine(command: string, args: string[]) {
  return [command, ...args.map(quoteArg)].filter(Boolean).join(" ");
}

function findActiveRun(runs: TranscriptRun[], agentName: string, phase: string) {
  return [...runs].reverse().find((run) => run.agentName === agentName && run.phase === phase && run.status === "running");
}

function fallbackCommand(agentName: string, phase: string, prompt: string) {
  if (agentName.toLowerCase().includes("codex")) return { command: "codex", args: ["exec", "-"] };
  if (agentName.toLowerCase().includes("claude")) return { command: "claude", args: ["-p"] };
  if (phase === "test" && prompt.trim()) return { command: prompt.trim(), args: [] };
  return { command: agentName.toLowerCase(), args: [] };
}

export function transcriptRunsFromEvents(events: TerminalEvent[]): TranscriptRun[] {
  const runs: TranscriptRun[] = [];

  for (const event of events) {
    if (event.type === "run_start") {
      runs.push({
        id: `${event.agentName}-${event.phase}-${runs.length}`,
        agentName: event.agentName,
        phase: event.phase,
        command: event.command,
        args: event.args,
        cwd: event.cwd,
        prompt: "",
        output: "",
        exitCode: null,
        status: "running"
      });
      continue;
    }

    if (event.type === "stdin") {
      const run = findActiveRun(runs, event.agentName, event.phase);
      if (run) run.prompt += event.content;
      continue;
    }

    if (event.type === "output") {
      const run = findActiveRun(runs, event.agentName, event.phase);
      if (run) run.output += event.content;
      continue;
    }

    if (event.type === "run_end") {
      const run = findActiveRun(runs, event.agentName, event.phase);
      if (run) {
        run.exitCode = event.exitCode;
        run.durationMs = event.durationMs;
        run.status = event.exitCode === 0 ? "complete" : "failed";
      }
    }
  }

  return runs;
}

export function transcriptRunFromAgentRun(run: AgentRun, cwd?: string): TranscriptRun {
  const fallback = fallbackCommand(run.agentName, run.phase, run.prompt);
  return {
    id: run.id,
    agentName: run.agentName,
    phase: run.phase,
    command: fallback.command,
    args: fallback.args,
    cwd,
    prompt: run.prompt,
    output: run.output,
    exitCode: run.exitCode,
    status: run.exitCode === null || run.exitCode === 0 ? "complete" : "failed"
  };
}

function statusTone(status: TranscriptStatus) {
  if (status === "running") return "border-primary/40 bg-primary/10 text-primary";
  if (status === "failed") return "border-red-400/40 bg-red-500/10 text-red-500 dark:text-red-300";
  return "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
}

function StatusIcon({ status }: { status: TranscriptStatus }) {
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5" />;
  return <CheckCircle2 className="h-3.5 w-3.5" />;
}

function TerminalBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-md border bg-background/92">
      <div className="flex items-center justify-between border-b bg-muted/35 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase text-muted-foreground">{label}</span>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
          onClick={() => void navigator.clipboard?.writeText(value)}
          title={`Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[12px] leading-5">
        <code>{value || "(empty)"}</code>
      </pre>
    </div>
  );
}

export function TerminalTranscript({ run }: { run: TranscriptRun }) {
  const statusLabel = run.status === "running" ? "running" : `exit ${run.exitCode ?? "?"}`;
  const duration = run.durationMs === undefined ? "" : ` ${Math.round(run.durationMs / 100) / 10}s`;

  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted/50">
        <Terminal className="h-4 w-4 text-primary" />
      </div>
      <div className="w-full max-w-[min(96ch,94%)] overflow-hidden rounded-lg border bg-card/90 shadow-sm">
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase text-primary">{run.agentName}</span>
                <span className="rounded border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{run.phase}</span>
              </div>
              {run.cwd ? <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">cwd {run.cwd}</div> : null}
            </div>
            <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px]", statusTone(run.status))}>
              <StatusIcon status={run.status} />
              {statusLabel}
              {duration}
            </span>
          </div>
          <pre className="mt-3 overflow-auto rounded-md border bg-background/85 px-3 py-2 font-mono text-[12px] leading-5">
            <code>$ {commandLine(run.command, run.args)}</code>
          </pre>
        </div>
        <div className="space-y-3 p-4">
          {run.prompt ? <TerminalBlock label="stdin prompt" value={run.prompt} /> : null}
          <TerminalBlock label="stdout + stderr" value={run.output} />
        </div>
      </div>
    </div>
  );
}
