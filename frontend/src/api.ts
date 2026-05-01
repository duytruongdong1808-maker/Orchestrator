export type Mode = "full" | "codex" | "review";
export type LegacyMode = Mode | "chat";

export type Task = {
  id: string;
  projectPath: string;
  userTask: string;
  testCommand?: string | null;
  mode: LegacyMode;
  status: string;
  baseHead?: string | null;
  createdAt: string;
  updatedAt: string;
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

export type DiffRecord = {
  id: string;
  taskId: string;
  phase: string;
  diffText: string;
  createdAt: string;
};

export type CliCheckItem = {
  ok: boolean;
  output: string;
  exitCode: number | null;
};

export type CliStatus = Record<"codex" | "claude" | "git" | "node", CliCheckItem>;

export type DirectoryEntry = {
  name: string;
  path: string;
};

export type DirectoryListing = {
  path: string;
  parentPath: string | null;
  directories: DirectoryEntry[];
};

export type OrchestrationResult = {
  task: Task;
  agentRuns: AgentRun[];
  diffs: DiffRecord[];
  finalDiff: string;
  changedFiles: string[];
  testResult?: { output: string; exitCode: number | null };
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

const TOKEN_KEY = "orchestrator.apiToken";

export function getStoredApiToken() {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setStoredApiToken(token: string) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredApiToken();
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-orchestrator-token": token } : {})
    },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed: ${response.status}`);
  }

  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean; name: string }>("/api/health"),
  filesystemRoots: () => request<{ roots: DirectoryEntry[] }>("/api/fs/roots"),
  filesystemDirectories: (path: string) =>
    request<DirectoryListing>(`/api/fs/directories?${new URLSearchParams({ path }).toString()}`),
  checkCli: (projectPath: string) =>
    request<CliStatus>("/api/check-cli", {
      method: "POST",
      body: JSON.stringify({ projectPath })
    }),
  orchestrate: (body: { projectPath: string; userTask: string; testCommand?: string; mode: Mode }) =>
    request<OrchestrationResult>("/api/orchestrate", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  orchestrateStream: async (
    body: { projectPath: string; userTask: string; testCommand?: string; mode: Mode },
    onEvent: (event: TerminalEvent) => void
  ) => {
    const token = getStoredApiToken();
    const response = await fetch("/api/orchestrate/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-orchestrator-token": token } : {})
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      const data = text ? JSON.parse(text) : undefined;
      throw new Error(data?.error ?? `Request failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Streaming response was empty.");
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let result: OrchestrationResult | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as TerminalEvent;
        onEvent(event);
        if (event.type === "orchestration_result") {
          result = event.result;
        }
        if (event.type === "orchestration_error") {
          throw new Error(event.error);
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const event = JSON.parse(buffer) as TerminalEvent;
      onEvent(event);
      if (event.type === "orchestration_result") {
        result = event.result;
      }
      if (event.type === "orchestration_error") {
        throw new Error(event.error);
      }
    }

    if (!result) {
      throw new Error("Stream ended before orchestration returned a result.");
    }

    return result;
  },
  listTasks: (projectPath?: string) =>
    request<Task[]>(projectPath ? `/api/tasks?${new URLSearchParams({ projectPath }).toString()}` : "/api/tasks"),
  getTask: (id: string) =>
    request<{ task: Task; agentRuns: AgentRun[]; diffs: DiffRecord[]; changedFiles: string[]; testResult?: { output: string; exitCode: number | null } }>(
      `/api/tasks/${id}`
    )
};
