import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { rollbackWorkingTree } from "./gitService.js";
import type { Task } from "../orchestrator/types.js";

function task(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    projectPath: os.tmpdir(),
    userTask: "test task",
    testCommand: null,
    mode: "full",
    status: "completed",
    baseHead: "abc123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

test("rollback fails when the task has no base HEAD", async () => {
  await assert.rejects(
    () => rollbackWorkingTree(task({ baseHead: null })),
    /no recorded base HEAD/
  );
});

test("rollback fails for non-code tasks", async () => {
  await assert.rejects(
    () => rollbackWorkingTree(task({ mode: "chat", baseHead: "abc123" })),
    /only available for code orchestration tasks/
  );
});

test("rollback reports Git validation errors instead of ignoring them", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-rollback-"));

  await assert.rejects(
    () => rollbackWorkingTree(task({ projectPath: dir, baseHead: "abc123" })),
    /not a git repository/i
  );
});
