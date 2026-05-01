export type OrchestrationMode = "chat" | "full" | "codex" | "review";

export type CliRunResult = {
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number | null;
};

export type AgentRun = {
  id: string;
  taskId: string;
  agentName: string;
  phase: string;
  prompt: string;
  output: string;
  exitCode: number | null;
  createdAt: string;
};

export type Task = {
  id: string;
  projectPath: string;
  userTask: string;
  testCommand?: string | null;
  mode: OrchestrationMode;
  status: string;
  baseHead?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiffRecord = {
  id: string;
  taskId: string;
  phase: string;
  diffText: string;
  createdAt: string;
};

export type OrchestrationResult = {
  task: Task;
  agentRuns: AgentRun[];
  diffs: DiffRecord[];
  finalDiff: string;
  changedFiles: string[];
  testResult?: CliRunResult;
  status: string;
  message?: string;
};
