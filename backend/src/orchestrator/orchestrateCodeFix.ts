import { execa } from "execa";
import { runClaude } from "../agents/claudeRunner.js";
import { runCodex } from "../agents/codexRunner.js";
import { database } from "../db/database.js";
import { ensureCleanWorkingTree, ensureGitRepo, getChangedFiles, getDiff, getHeadHash } from "../git/gitService.js";
import { assertSafeTestCommand } from "../safety/commandGuard.js";
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
  if (!command?.trim()) return undefined;
  assertSafeTestCommand(command);
  const result = await execa(command, {
    cwd,
    all: true,
    shell: true,
    reject: false
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    output: result.all ?? [result.stdout, result.stderr].filter(Boolean).join("\n"),
    exitCode: result.exitCode ?? null
  };
}

export async function orchestrateCodeFix(input: {
  projectPath: string;
  userTask: string;
  testCommand?: string | null;
  mode: OrchestrationMode;
}): Promise<OrchestrationResult> {
  assertSafeTestCommand(input.testCommand);

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
  await ensureCleanWorkingTree(input.projectPath);
  await getHeadHash(input.projectPath);

  let task = database.createTask({
    projectPath: input.projectPath,
    userTask: input.userTask,
    testCommand: input.testCommand,
    mode: input.mode,
    status: "running"
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
    let plan = "No Claude planning run for this mode.";
    if (input.mode === "full" || input.mode === "review") {
      const prompt = buildClaudePlanningPrompt(input.userTask);
      const result = await runClaude(input.projectPath, prompt);
      addRun("Claude", "planning", prompt, result);
      plan = result.output;
    }

    if (input.mode === "full" || input.mode === "codex") {
      const prompt = buildCodexImplementationPrompt(input.userTask, plan);
      const result = await runCodex(input.projectPath, prompt);
      addRun("Codex", "implementation", prompt, result);
    }

    const firstDiff = await getDiff(input.projectPath);
    database.addDiff({ taskId: task.id, phase: "implementation", diffText: firstDiff });

    let review = "Review skipped for codex-only mode.";
    if (input.mode === "full" || input.mode === "review") {
      const reviewPrompt = buildClaudeReviewPrompt(input.userTask, filterSensitiveDiffForPrompt(firstDiff));
      const reviewResult = await runClaude(input.projectPath, reviewPrompt);
      addRun("Claude", "review", reviewPrompt, reviewResult);
      review = reviewResult.output;

      if (input.mode === "full" && reviewNeedsRevision(review)) {
        const revisionPrompt = buildCodexRevisionPrompt(input.userTask, filterSensitiveDiffForPrompt(firstDiff), review);
        const revisionResult = await runCodex(input.projectPath, revisionPrompt);
        addRun("Codex", "revision", revisionPrompt, revisionResult);
      }
    }

    const finalDiff = await getDiff(input.projectPath);
    database.addDiff({ taskId: task.id, phase: "final", diffText: finalDiff });

    const testResult = await runTestCommand(input.projectPath, input.testCommand);
    if (testResult) {
      addRun("System", "test", input.testCommand ?? "", testResult);
    }

    const changedFiles = await getChangedFiles(input.projectPath);
    const status = finalDiff.trim() ? (testResult?.exitCode ? "tests_failed" : "completed") : "no_changes";
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
