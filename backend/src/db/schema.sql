CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  user_task TEXT NOT NULL,
  test_command TEXT,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
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
