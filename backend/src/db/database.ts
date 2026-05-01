import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type { AgentRun, DiffRecord, OrchestrationMode, Task } from "../orchestrator/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(process.cwd(), "code-orchestrator.sqlite");
const schemaPath = fs.existsSync(path.resolve(__dirname, "schema.sql"))
  ? path.resolve(__dirname, "schema.sql")
  : path.resolve(process.cwd(), "src", "db", "schema.sql");
const fallbackSchema = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  user_task TEXT NOT NULL,
  test_command TEXT,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  base_head TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  phase TEXT NOT NULL,
  prompt TEXT NOT NULL,
  output TEXT NOT NULL,
  exit_code INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS diffs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  diff_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
`;

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec(fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, "utf8") : fallbackSchema);

const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
if (!taskColumns.some((column) => column.name === "base_head")) {
  db.exec("ALTER TABLE tasks ADD COLUMN base_head TEXT");
}

function now() {
  return new Date().toISOString();
}

function mapTask(row: any): Task {
  return {
    id: row.id,
    projectPath: row.project_path,
    userTask: row.user_task,
    testCommand: row.test_command,
    mode: row.mode,
    status: row.status,
    baseHead: row.base_head,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAgentRun(row: any): AgentRun {
  return {
    id: row.id,
    taskId: row.task_id,
    agentName: row.agent_name,
    phase: row.phase,
    prompt: row.prompt,
    output: row.output,
    exitCode: row.exit_code,
    createdAt: row.created_at
  };
}

function mapDiff(row: any): DiffRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    phase: row.phase,
    diffText: row.diff_text,
    createdAt: row.created_at
  };
}

export const database = {
  createTask(input: {
    projectPath: string;
    userTask: string;
    testCommand?: string | null;
    mode: OrchestrationMode;
    status: string;
    baseHead?: string | null;
  }): Task {
    const timestamp = now();
    const task: Task = {
      id: crypto.randomUUID(),
      projectPath: input.projectPath,
      userTask: input.userTask,
      testCommand: input.testCommand ?? null,
      mode: input.mode,
      status: input.status,
      baseHead: input.baseHead ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    db.prepare(
      `INSERT INTO tasks (id, project_path, user_task, test_command, mode, status, base_head, created_at, updated_at)
       VALUES (@id, @projectPath, @userTask, @testCommand, @mode, @status, @baseHead, @createdAt, @updatedAt)`
    ).run(task as any);

    return task;
  },

  updateTaskStatus(id: string, status: string): Task {
    db.prepare("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), id);
    return this.getTask(id)!;
  },

  getTask(id: string): Task | undefined {
    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    return row ? mapTask(row) : undefined;
  },

  listTasks(projectPath?: string): Task[] {
    if (projectPath) {
      return db.prepare("SELECT * FROM tasks WHERE lower(project_path) = lower(?) ORDER BY created_at DESC LIMIT 50").all(projectPath).map(mapTask);
    }
    return db.prepare("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 50").all().map(mapTask);
  },

  addAgentRun(input: Omit<AgentRun, "id" | "createdAt">): AgentRun {
    const run: AgentRun = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now()
    };
    db.prepare(
      `INSERT INTO agent_runs (id, task_id, agent_name, phase, prompt, output, exit_code, created_at)
       VALUES (@id, @taskId, @agentName, @phase, @prompt, @output, @exitCode, @createdAt)`
    ).run(run as any);
    return run;
  },

  listAgentRuns(taskId: string): AgentRun[] {
    return db.prepare("SELECT * FROM agent_runs WHERE task_id = ? ORDER BY created_at ASC").all(taskId).map(mapAgentRun);
  },

  addDiff(input: Omit<DiffRecord, "id" | "createdAt">): DiffRecord {
    const diff: DiffRecord = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now()
    };
    db.prepare(
      `INSERT INTO diffs (id, task_id, phase, diff_text, created_at)
       VALUES (@id, @taskId, @phase, @diffText, @createdAt)`
    ).run(diff as any);
    return diff;
  },

  listDiffs(taskId: string): DiffRecord[] {
    return db.prepare("SELECT * FROM diffs WHERE task_id = ? ORDER BY created_at ASC").all(taskId).map(mapDiff);
  }
};
