import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execa } from "execa";
import { getChangedFiles, getDiff, rollbackWorkingTree } from "./gitService.js";
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

test("getDiff includes tracked, staged, and untracked file changes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-diff-"));

  await execa("git", ["init"], { cwd: dir });
  await execa("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execa("git", ["config", "user.name", "Test User"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "tracked.txt"), "old\n");
  await execa("git", ["add", "."], { cwd: dir });
  await execa("git", ["commit", "-m", "initial"], { cwd: dir });

  fs.writeFileSync(path.join(dir, "tracked.txt"), "new\n");
  fs.writeFileSync(path.join(dir, "staged.txt"), "staged\n");
  await execa("git", ["add", "staged.txt"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "untracked.txt"), "untracked\n");

  const diff = await getDiff(dir);
  assert.match(diff, /diff --git a\/tracked\.txt b\/tracked\.txt/);
  assert.match(diff, /\+new/);
  assert.match(diff, /diff --git a\/staged\.txt b\/staged\.txt/);
  assert.match(diff, /\+staged/);
  assert.match(diff, /diff --git a\/untracked\.txt b\/untracked\.txt/);
  assert.match(diff, /\+untracked/);

  const changedFiles = await getChangedFiles(dir);
  assert.deepEqual([...changedFiles].sort(), ["staged.txt", "tracked.txt", "untracked.txt"]);
});
