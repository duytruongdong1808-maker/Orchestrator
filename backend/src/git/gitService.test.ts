import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execa } from "execa";
import { getChangedFiles, getChangedFilesFromDiff, getDiff } from "./gitService.js";

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

test("getChangedFilesFromDiff extracts unique file paths from stored diff text", () => {
  const diff = [
    "diff --git a/src/old.ts b/src/new.ts",
    "similarity index 92%",
    "rename from src/old.ts",
    "rename to src/new.ts",
    "diff --git a/src/new.ts b/src/new.ts",
    "@@ -1 +1 @@",
    "-old",
    "+new",
    "diff --git a/docs/readme.md b/docs/readme.md"
  ].join("\n");

  assert.deepEqual(getChangedFilesFromDiff(diff), ["src/new.ts", "docs/readme.md"]);
});
