import { runCliCommand, type CliRunObserver } from "./cliRunner.js";
import type { CliRunResult } from "../orchestrator/types.js";

export async function runClaude(cwd: string, prompt: string, phase = "unknown", onEvent?: CliRunObserver): Promise<CliRunResult> {
  return runCliCommand({
    cwd,
    command: "claude",
    args: ["-p"],
    stdin: prompt,
    agentName: "Claude",
    phase,
    onEvent
  });
}
