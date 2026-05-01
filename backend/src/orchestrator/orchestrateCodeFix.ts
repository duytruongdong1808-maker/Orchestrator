import { execa } from "execa";
import { runClaude } from "../agents/claudeRunner.js";
import { runCodex } from "../agents/codexRunner.js";
import { database } from "../db/database.js";
import { ensureCleanWorkingTree, ensureGitRepo, getChangedFiles, getDiff, getHeadHash } from "../git/gitService.js";
import { resolveSafePackageScript } from "../safety/commandGuard.js";
import { filterSensitiveDiffForPrompt } from "../safety/fileGuard.js";
import {
  buildClaudeChatPrompt,
  buildClaudePlanningPrompt,
  buildClaudeReviewPrompt,
  buildCodexImplementationPrompt,
  buildCodexRevisionPrompt
} from "./prompts.js";
import type { CliRunResult, OrchestrationMode, OrchestrationResult } from "./types.js";

function reviewNeedsRevision(output: string) {
  return /VERDICT:\s*(NEEDS_CHANGES|CRITICAL)/i.test(output);
}

async function runTestCommand(cwd: string, command?: string | null): Promise<CliRunResult | undefined> {
  const safeScript = resolveSafePackageScript(cwd, command);
  if (!safeScript) return undefined;

  const result = await execa(safeScript.command, safeScript.args, {
    cwd,
    all: true,
    reject: false
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    output: result.all ?? [result.stdout, result.stderr].filter(Boolean).join("\n"),
    exitCode: result.exitCode ?? null
  };
}

function throwIfCliFailed(agentName: string, phase: string, result: CliRunResult) {
  if (result.exitCode !== 0) {
    throw new Error(`${agentName} ${phase} failed with exit code ${result.exitCode ?? "unknown"}.`);
  }
}

export async function orchestrateCodeFix(input: {
  projectPath: string;
  userTask: string;
  testCommand?: string | null;
  mode: OrchestrationMode;
}): Promise<OrchestrationResult> {
  if (input.mode === "full" || input.mode === "codex") {
    resolveSafePackageScript(input.projectPath || process.cwd(), input.testCommand);
  }

  if (input.mode === "chat") {
    let task = database.createTask({
      projectPath: input.projectPath || process.cwd(),
      userTask: input.userTask,
      testCommand: null,
      mode: input.mode,
      status: "running"
    });

    try {
      const prompt = buildClaudeChatPrompt(input.userTask);
      const result = await runClaude(input.projectPath || process.cwd(), prompt);
      database.addAgentRun({
        taskId: task.id,
        agentName: "Claude",
        phase: "chat",
        prompt,
        output: result.output,
        exitCode: result.exitCode
      });
      throwIfCliFailed("Claude", "chat", result);
      task = database.updateTaskStatus(task.id, result.exitCode === 0 ? "completed" : "failed");

      return {
        task,
        agentRuns: database.listAgentRuns(task.id),
        diffs: [],
        finalDiff: "",
        changedFiles: [],
        status: task.status,
        message: result.exitCode === 0 ? "Chat response complete." : "Chat command failed."
      };
    } catch (error) {
      task = database.updateTaskStatus(task.id, "failed");
      throw error;
    }
  }

  await ensureGitRepo(input.projectPath);
  const baseHead = await getHeadHash(input.projectPath);
  if (input.mode !== "review") {
    await ensureCleanWorkingTree(input.projectPath);
  }

  let task = database.createTask({
    projectPath: input.projectPath,
    userTask: input.userTask,
    testCommand: input.testCommand,
    mode: input.mode,
    status: "running",
    baseHead: input.mode === "full" || input.mode === "codex" ? baseHead : null
  });

  const addRun = (agentName: string, phase: string, prompt: string, result: CliRunResult) =>
    database.addAgentRun({
      taskId: task.id,
      agentName,
      phase,
      prompt,
      output: result.output,
      exitCode: result.exitCode
    });

  try {
    if (input.mode === "review") {
      const reviewDiff = await getDiff(input.projectPath);
      database.addDiff({ taskId: task.id, phase: "review_input", diffText: reviewDiff });

      if (reviewDiff.trim()) {
        const reviewPrompt = buildClaudeReviewPrompt(input.userTask, filterSensitiveDiffForPrompt(reviewDiff));
        const reviewResult = await runClaude(input.projectPath, reviewPrompt);
        addRun("Claude", "review", reviewPrompt, reviewResult);
        throwIfCliFailed("Claude", "review", reviewResult);
      }

      const changedFiles = await getChangedFiles(input.projectPath);
      const status = reviewDiff.trim() ? "completed" : "no_changes";
      task = database.updateTaskStatus(task.id, status);

      return {
        task,
        agentRuns: database.listAgentRuns(task.id),
        diffs: database.listDiffs(task.id),
        finalDiff: reviewDiff,
        changedFiles,
        status,
        message: status === "no_changes" ? "Review mode found no existing git diff to review." : "Review mode inspected the existing git diff without modifying files."
      };
    }

    let plan = "No Claude planning run for this mode.";
    if (input.mode === "full") {
      const prompt = buildClaudePlanningPrompt(input.userTask);
      const result = await runClaude(input.projectPath, prompt);
      addRun("Claude", "planning", prompt, result);
      throwIfCliFailed("Claude", "planning", result);
      plan = result.output;
    }

    if (input.mode === "full" || input.mode === "codex") {
      const prompt = buildCodexImplementationPrompt(input.userTask, plan);
      const result = await runCodex(input.projectPath, prompt);
      addRun("Codex", "implementation", prompt, result);
      throwIfCliFailed("Codex", "implementation", result);
    }

    const firstDiff = await getDiff(input.projectPath);
    database.addDiff({ taskId: task.id, phase: "implementation", diffText: firstDiff });

    let review = "Review skipped for codex-only mode.";
    if (input.mode === "full") {
      const reviewPrompt = buildClaudeReviewPrompt(input.userTask, filterSensitiveDiffForPrompt(firstDiff));
      const reviewResult = await runClaude(input.projectPath, reviewPrompt);
      addRun("Claude", "review", reviewPrompt, reviewResult);
      throwIfCliFailed("Claude", "review", reviewResult);
      review = reviewResult.output;

      if (input.mode === "full" && reviewNeedsRevision(review)) {
        const revisionPrompt = buildCodexRevisionPrompt(input.userTask, filterSensitiveDiffForPrompt(firstDiff), review);
        const revisionResult = await runCodex(input.projectPath, revisionPrompt);
        addRun("Codex", "revision", revisionPrompt, revisionResult);
        throwIfCliFailed("Codex", "revision", revisionResult);
      }
    }

    const finalDiff = await getDiff(input.projectPath);
    database.addDiff({ taskId: task.id, phase: "final", diffText: finalDiff });

    const testResult = await runTestCommand(input.projectPath, input.testCommand);
    if (testResult) {
      addRun("System", "test", input.testCommand ?? "", testResult);
    }

    const changedFiles = await getChangedFiles(input.projectPath);
    const testsFailed = testResult ? testResult.exitCode !== 0 : false;
    const status = testsFailed ? "tests_failed" : finalDiff.trim() ? "completed" : "no_changes";
    task = database.updateTaskStatus(task.id, status);

    return {
      task,
      agentRuns: database.listAgentRuns(task.id),
      diffs: database.listDiffs(task.id),
      finalDiff,
      changedFiles,
      testResult,
      status,
      message: status === "no_changes" ? "Codex produced no git diff." : undefined
    };
  } catch (error) {
    task = database.updateTaskStatus(task.id, "failed");
    throw error;
  }
}
