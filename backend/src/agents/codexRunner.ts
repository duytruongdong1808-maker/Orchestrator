import { runCliCommand, type CliRunObserver } from "./cliRunner.js";
import type { CliRunResult } from "../orchestrator/types.js";

export async function runCodex(cwd: string, prompt: string, phase = "unknown", onEvent?: CliRunObserver): Promise<CliRunResult> {
  return runCliCommand({
    cwd,
    command: "codex",
    args: ["exec", "-"],
    stdin: prompt,
    agentName: "Codex",
    phase,
    onEvent
  });
}
