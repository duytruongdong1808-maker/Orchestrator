import { execa } from "execa";
import type { CliRunResult } from "../orchestrator/types.js";

export type CliRunEvent =
  | {
      type: "run_start";
      agentName: string;
      phase: string;
      command: string;
      args: string[];
      cwd: string;
      timestamp: string;
    }
  | {
      type: "stdin";
      agentName: string;
      phase: string;
      content: string;
      timestamp: string;
    }
  | {
      type: "output";
      agentName: string;
      phase: string;
      stream: "all";
      content: string;
      timestamp: string;
    }
  | {
      type: "run_end";
      agentName: string;
      phase: string;
      exitCode: number | null;
      timestamp: string;
      durationMs?: number;
    };

export type CliRunObserver = (event: CliRunEvent) => void;

function now() {
  return new Date().toISOString();
}

function toText(value: unknown) {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  if (Array.isArray(value)) return value.join("\n");
  return value == null ? "" : String(value);
}

export async function runCliCommand(input: {
  cwd: string;
  command: string;
  args: string[];
  stdin?: string;
  agentName: string;
  phase: string;
  onEvent?: CliRunObserver;
}): Promise<CliRunResult> {
  input.onEvent?.({
    type: "run_start",
    agentName: input.agentName,
    phase: input.phase,
    command: input.command,
    args: input.args,
    cwd: input.cwd,
    timestamp: now()
  });

  if (input.stdin !== undefined) {
    input.onEvent?.({
      type: "stdin",
      agentName: input.agentName,
      phase: input.phase,
      content: input.stdin,
      timestamp: now()
    });
  }

  const startedAt = Date.now();
  const subprocess = execa(input.command, input.args, {
    cwd: input.cwd,
    all: true,
    shell: false,
    input: input.stdin,
    reject: false
  });

  subprocess.all?.on("data", (chunk) => {
    input.onEvent?.({
      type: "output",
      agentName: input.agentName,
      phase: input.phase,
      stream: "all",
      content: toText(chunk),
      timestamp: now()
    });
  });

  const result = await subprocess;
  const exitCode = result.exitCode ?? null;

  input.onEvent?.({
    type: "run_end",
    agentName: input.agentName,
    phase: input.phase,
    exitCode,
    timestamp: now(),
    durationMs: Date.now() - startedAt
  });

  return {
    stdout: toText(result.stdout),
    stderr: toText(result.stderr),
    output: toText(result.all) || [toText(result.stdout), toText(result.stderr)].filter(Boolean).join("\n"),
    exitCode
  };
}
