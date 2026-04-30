const blockedPatterns = [
  /rm\s+-rf/i,
  /del\s+\/s/i,
  /rmdir\s+\/s/i,
  /\bformat\b/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-fd/i,
  /git\s+push\s+--force/i,
  /npm\s+publish/i,
  /pnpm\s+publish/i,
  /docker\s+system\s+prune/i
];

export function assertSafeTestCommand(command?: string | null) {
  if (!command?.trim()) return;

  const blocked = blockedPatterns.find((pattern) => pattern.test(command));
  if (blocked) {
    throw new Error(`Blocked unsafe test command: ${command}`);
  }
}
