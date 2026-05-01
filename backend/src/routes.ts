import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import { z } from "zod";
import { checkCli } from "./agents/cliCheck.js";
import { database } from "./db/database.js";
import { rollbackWorkingTree } from "./git/gitService.js";
import { orchestrateCodeFix } from "./orchestrator/orchestrateCodeFix.js";

const router = express.Router();

type DirectoryEntry = {
  name: string;
  path: string;
};

async function pathExists(candidate: string) {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function getFilesystemRoots(): Promise<DirectoryEntry[]> {
  const candidates = new Set<string>();
  candidates.add(process.cwd());
  const homeDirectory = os.homedir();
  if (homeDirectory) candidates.add(homeDirectory);

  if (process.platform === "win32") {
    for (let code = 65; code <= 90; code += 1) {
      candidates.add(`${String.fromCharCode(code)}:\\`);
    }
  } else {
    candidates.add("/");
  }

  const roots = await Promise.all(
    [...candidates].map(async (candidate) => {
      const resolved = path.resolve(candidate);
      if (!(await pathExists(resolved))) return undefined;
      return {
        name: resolved,
        path: resolved
      };
    })
  );

  return roots
    .filter((root): root is DirectoryEntry => Boolean(root))
    .filter((root, index, all) => all.findIndex((item) => item.path.toLowerCase() === root.path.toLowerCase()) === index)
    .sort((left, right) => left.path.localeCompare(right.path));
}

async function listDirectories(directoryPath: string) {
  const resolved = path.resolve(directoryPath);
  const stat = await fs.stat(resolved).catch((error: NodeJS.ErrnoException) => {
    throw new Error(error.code === "ENOENT" ? "Folder not found." : `Unable to access folder: ${error.message}`);
  });

  if (!stat.isDirectory()) {
    throw new Error("Selected path is not a folder.");
  }

  const entries = await fs.readdir(resolved, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    throw new Error(error.code === "EACCES" || error.code === "EPERM" ? "Access denied for this folder." : `Unable to read folder: ${error.message}`);
  });

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: path.join(resolved, entry.name)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const parentPath = path.dirname(resolved);
  return {
    path: resolved,
    parentPath: parentPath === resolved ? null : parentPath,
    directories
  };
}

export function requireApiToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const configuredToken = process.env.ORCHESTRATOR_API_TOKEN;
  if (!configuredToken) {
    res.status(503).json({ error: "ORCHESTRATOR_API_TOKEN is required before using protected API routes." });
    return;
  }

  const authHeader = req.header("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : undefined;
  const providedToken = req.header("x-orchestrator-token") ?? bearerToken;

  if (!providedToken || providedToken !== configuredToken) {
    res.status(401).json({ error: "Valid local API token required." });
    return;
  }

  next();
}

const orchestrateSchema = z.object({
  projectPath: z.string().trim().optional().default(""),
  userTask: z.string().trim().min(1, "Task is required."),
  testCommand: z.string().optional().nullable(),
  mode: z.enum(["chat", "full", "codex", "review"]).default("full")
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, name: "Code Orchestrator" });
});

router.get("/fs/roots", requireApiToken, async (_req, res, next) => {
  try {
    res.json({ roots: await getFilesystemRoots() });
  } catch (error) {
    next(error);
  }
});

router.get("/fs/directories", requireApiToken, async (req, res, next) => {
  try {
    const directoryPath = z.string().trim().min(1, "Path is required.").parse(req.query.path);
    res.json(await listDirectories(directoryPath));
  } catch (error) {
    next(error);
  }
});

router.post("/check-cli", requireApiToken, async (req, res, next) => {
  try {
    const projectPath = typeof req.body?.projectPath === "string" ? req.body.projectPath : undefined;
    res.json(await checkCli(projectPath));
  } catch (error) {
    next(error);
  }
});

router.post("/orchestrate", requireApiToken, async (req, res, next) => {
  try {
    const input = orchestrateSchema.parse(req.body);
    if (input.mode !== "chat" && !input.projectPath) {
      throw new Error("Project path is required for code modes.");
    }
    res.json(await orchestrateCodeFix(input));
  } catch (error) {
    next(error);
  }
});

router.get("/tasks", (_req, res) => {
  res.json(database.listTasks());
});

router.get("/tasks/:id", (req, res) => {
  const task = database.getTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({
    task,
    agentRuns: database.listAgentRuns(task.id),
    diffs: database.listDiffs(task.id)
  });
});

router.post("/tasks/:id/approve", (req, res) => {
  const task = database.getTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(database.updateTaskStatus(task.id, "approved"));
});

router.post("/tasks/:id/rollback", requireApiToken, async (req, res, next) => {
  try {
    const task = database.getTask(String(req.params.id));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    await rollbackWorkingTree(task);
    const updated = database.updateTaskStatus(task.id, "rolled_back");
    res.json({ task: updated, ok: true, message: "Rollback completed." });
  } catch (error) {
    next(error);
  }
});

export { router };
