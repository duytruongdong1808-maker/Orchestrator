import { execa } from "execa";
import type { CliRunResult } from "../orchestrator/types.js";

export async function runCodex(cwd: string, prompt: string): Promise<CliRunResult> {
  const result = await execa("codex", ["exec", prompt], {
    cwd,
    all: true,
    shell: false,
    reject: false
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    output: result.all ?? [result.stdout, result.stderr].filter(Boolean).join("\n"),
    exitCode: result.exitCode ?? null
  };
}
