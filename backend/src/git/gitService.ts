import { execa } from "execa";
import { simpleGit } from "simple-git";

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
  const git = simpleGit(projectPath);
  return git.diff(["--no-ext-diff"]);
}

export async function getChangedFiles(projectPath: string) {
  const git = simpleGit(projectPath);
  const status = await git.status();
  return [...status.modified, ...status.created, ...status.deleted, ...status.renamed.map((file) => file.to)];
}

export async function rollbackWorkingTree(projectPath: string) {
  // Warning: this deletes untracked files created during orchestration.
  await execa("git", ["checkout", "--", "."], { cwd: projectPath, shell: true, reject: false });
  await execa("git", ["clean", "-fd"], { cwd: projectPath, shell: true, reject: false });
}
