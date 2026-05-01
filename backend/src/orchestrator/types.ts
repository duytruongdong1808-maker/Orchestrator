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

export type TerminalEvent =
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
    }
  | {
      type: "orchestration_result";
      result: OrchestrationResult;
      timestamp: string;
    }
  | {
      type: "orchestration_error";
      error: string;
      timestamp: string;
    };
