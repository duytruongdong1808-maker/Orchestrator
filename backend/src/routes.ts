import express from "express";
import { z } from "zod";
import { checkCli } from "./agents/cliCheck.js";
import { database } from "./db/database.js";
import { rollbackWorkingTree } from "./git/gitService.js";
import { orchestrateCodeFix } from "./orchestrator/orchestrateCodeFix.js";

const router = express.Router();

const orchestrateSchema = z.object({
  projectPath: z.string().trim().optional().default(""),
  userTask: z.string().trim().min(1, "Task is required."),
  testCommand: z.string().optional().nullable(),
  mode: z.enum(["chat", "full", "codex", "review"]).default("full")
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, name: "Code Orchestrator" });
});

router.post("/check-cli", async (req, res, next) => {
  try {
    const projectPath = typeof req.body?.projectPath === "string" ? req.body.projectPath : undefined;
    res.json(await checkCli(projectPath));
  } catch (error) {
    next(error);
  }
});

router.post("/orchestrate", async (req, res, next) => {
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

router.post("/tasks/:id/rollback", async (req, res, next) => {
  try {
    const task = database.getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    await rollbackWorkingTree(task.projectPath);
    res.json(database.updateTaskStatus(task.id, "rolled_back"));
  } catch (error) {
    next(error);
  }
});

export { router };
