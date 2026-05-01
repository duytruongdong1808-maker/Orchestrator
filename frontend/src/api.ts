export type Mode = "chat" | "full" | "codex" | "review";

export type Task = {
  id: string;
  projectPath: string;
  userTask: string;
  testCommand?: string | null;
  mode: Mode;
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
  listTasks: () => request<Task[]>("/api/tasks"),
  getTask: (id: string) => request<{ task: Task; agentRuns: AgentRun[]; diffs: DiffRecord[] }>(`/api/tasks/${id}`),
  approve: (id: string) => request<Task>(`/api/tasks/${id}/approve`, { method: "POST" }),
  rollback: (id: string) => request<{ task: Task; ok: boolean; message: string }>(`/api/tasks/${id}/rollback`, { method: "POST" })
};
