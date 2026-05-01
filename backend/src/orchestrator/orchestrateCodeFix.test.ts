import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execa } from "execa";
import { database } from "../db/database.js";
import { orchestrateCodeFix } from "./orchestrateCodeFix.js";

function pathEnvKey() {
  return Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
}

function writeFakeCommand(dir: string, name: "claude" | "codex", exitCode: number) {
  const shellPath = path.join(dir, name);
  fs.writeFileSync(shellPath, `#!/bin/sh\necho "${name} stdout"\necho "${name} stderr" >&2\nexit ${exitCode}\n`);
  fs.chmodSync(shellPath, 0o755);

  const cmdPath = path.join(dir, `${name}.cmd`);
  fs.writeFileSync(cmdPath, `@echo off\r\necho ${name} stdout\r\necho ${name} stderr 1>&2\r\nexit /b ${exitCode}\r\n`);
}

async function withFakeCli<T>(exits: { claude?: number; codex?: number }, run: () => Promise<T>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-cli-"));
  writeFakeCommand(dir, "claude", exits.claude ?? 0);
  writeFakeCommand(dir, "codex", exits.codex ?? 0);

  const key = pathEnvKey();
  const originalPath = process.env[key];
  process.env[key] = `${dir}${path.delimiter}${originalPath ?? ""}`;

  try {
    return await run();
  } finally {
    process.env[key] = originalPath;
  }
}

async function makeGitProject(scripts: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-project-"));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        packageManager: "npm@10.0.0",
        scripts
      },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(dir, "README.md"), "# Test project\n");

  await execa("git", ["init"], { cwd: dir });
  await execa("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execa("git", ["config", "user.name", "Test User"], { cwd: dir });
  await execa("git", ["add", "."], { cwd: dir });
  await execa("git", ["commit", "-m", "initial"], { cwd: dir });

  return dir;
}

function latestTaskFor(userTask: string) {
  const task = database.listTasks().find((item) => item.userTask === userTask);
  assert(task, `Expected task "${userTask}" to be persisted.`);
  return task;
}

test("non-zero Claude exit marks the task as failed and persists the failed run", async () => {
  const userTask = `claude failure ${crypto.randomUUID()}`;

  await withFakeCli({ claude: 4 }, async () => {
    await assert.rejects(
      () => orchestrateCodeFix({ projectPath: "", userTask, mode: "chat" }),
      /Claude chat failed/
    );
  });

  const task = latestTaskFor(userTask);
  assert.equal(task.status, "failed");

  const runs = database.listAgentRuns(task.id);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].agentName, "Claude");
  assert.equal(runs[0].exitCode, 4);
  assert.match(runs[0].output, /claude stdout/);
});

test("non-zero Codex exit marks the task as failed and does not continue to completed state", async () => {
  const projectPath = await makeGitProject();
  const userTask = `codex failure ${crypto.randomUUID()}`;

  await withFakeCli({ codex: 9 }, async () => {
    await assert.rejects(
      () => orchestrateCodeFix({ projectPath, userTask, mode: "codex" }),
      /Codex implementation failed/
    );
  });

  const task = latestTaskFor(userTask);
  assert.equal(task.status, "failed");
  assert.notEqual(task.status, "completed");
  assert.notEqual(task.status, "no_changes");

  const runs = database.listAgentRuns(task.id);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].agentName, "Codex");
  assert.equal(runs[0].exitCode, 9);
});

test("test command failure is stored clearly", async () => {
  const projectPath = await makeGitProject({
    test: "node -e \"console.error('test failed clearly'); process.exit(3)\""
  });
  const userTask = `test failure ${crypto.randomUUID()}`;

  const result = await withFakeCli({ codex: 0 }, async () =>
    orchestrateCodeFix({ projectPath, userTask, mode: "codex", testCommand: "test" }).then((value) => value)
  );

  assert.equal(result.status, "tests_failed");
  assert.equal(result.testResult?.exitCode, 3);
  assert.match(result.testResult?.output ?? "", /test failed clearly/);

  const testRun = result.agentRuns.find((run) => run.phase === "test");
  assert(testRun);
  assert.equal(testRun.exitCode, 3);
  assert.match(testRun.output, /test failed clearly/);
});
