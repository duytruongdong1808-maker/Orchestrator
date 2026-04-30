import { execa } from "execa";

async function checkBinary(command: string, args: string[] = ["--version"], cwd?: string) {
  const result = await execa(command, args, {
    cwd,
    all: true,
    shell: true,
    reject: false
  });

  return {
    ok: result.exitCode === 0,
    output: result.all ?? result.stdout ?? result.stderr ?? "",
    exitCode: result.exitCode ?? null
  };
}

export async function checkCli(projectPath?: string) {
  const [codex, claude, git, node] = await Promise.all([
    checkBinary("codex"),
    checkBinary("claude"),
    checkBinary("git"),
    checkBinary("node", ["--version"], projectPath)
  ]);

  return { codex, claude, git, node };
}
