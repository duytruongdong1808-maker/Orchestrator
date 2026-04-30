import { execa } from "execa";
import type { CliRunResult } from "../orchestrator/types.js";

export async function runClaude(cwd: string, prompt: string): Promise<CliRunResult> {
  const result = await execa("claude", ["-p"], {
    cwd,
    all: true,
    shell: false,
    input: prompt,
    reject: false
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    output: result.all ?? [result.stdout, result.stderr].filter(Boolean).join("\n"),
    exitCode: result.exitCode ?? null
  };
}
