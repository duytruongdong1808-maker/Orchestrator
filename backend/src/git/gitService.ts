import { execa } from "execa";
import fs from "node:fs";
import { simpleGit } from "simple-git";
import type { Task } from "../orchestrator/types.js";

export async function ensureGitRepo(projectPath: string) {
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error("Selected project path is not a git repository.");
  }
}

export async function ensureCleanWorkingTree(projectPath: string) {
  const git = simpleGit(projectPath);
  const status = await git.status();
  if (!status.isClean()) {
    throw new Error("Please commit, stash, or discard your changes before running AI orchestration.");
  }
}

export async function getHeadHash(projectPath: string) {
  const git = simpleGit(projectPath);
  return git.revparse(["HEAD"]);
}

export async function getDiff(projectPath: string) {
  const trackedDiff = await execa("git", ["diff", "--no-ext-diff", "--binary", "HEAD", "--"], {
    cwd: projectPath,
    reject: true
  });
  const untrackedFiles = await execa("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
    cwd: projectPath,
    reject: true
  });

  const untrackedDiffs = await Promise.all(
    untrackedFiles.stdout
      .split("\0")
      .filter(Boolean)
      .map(async (filePath) => {
        const result = await execa("git", ["diff", "--no-index", "--binary", "--", "/dev/null", filePath], {
          cwd: projectPath,
          reject: false
        });
        return result.stdout;
      })
  );

  return [trackedDiff.stdout, ...untrackedDiffs].filter(Boolean).join("\n");
}

export async function getChangedFiles(projectPath: string) {
  const git = simpleGit(projectPath);
  const status = await git.status();
  return [
    ...status.modified,
    ...status.created,
    ...status.deleted,
    ...status.not_added,
    ...status.renamed.map((file) => file.to)
  ];
}

export async function rollbackWorkingTree(task: Task) {
  if (task.mode !== "full" && task.mode !== "codex") {
    throw new Error("Rollback is only available for code orchestration tasks.");
  }
  if (!task.baseHead) {
    throw new Error("Rollback is unavailable because this task has no recorded base HEAD.");
  }
  if (!fs.existsSync(task.projectPath)) {
    throw new Error("Rollback failed because the stored project path no longer exists.");
  }

  await ensureGitRepo(task.projectPath);

  const currentHead = (await getHeadHash(task.projectPath)).trim();
  if (currentHead !== task.baseHead.trim()) {
    throw new Error("Rollback refused because the repository HEAD changed after orchestration.");
  }

  // Warning: this deletes untracked files created during orchestration.
  await execa("git", ["reset", "--hard", task.baseHead], { cwd: task.projectPath, reject: true });
  await execa("git", ["clean", "-fd"], { cwd: task.projectPath, reject: true });
}
