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

export function getChangedFilesFromDiff(diff: string) {
  const files = new Set<string>();

  for (const line of diff.split(/\r?\n/)) {
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (match) {
      files.add(match[2]);
    }
  }

  return [...files];
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
