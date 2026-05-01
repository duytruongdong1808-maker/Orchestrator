import type { Mode, OrchestrationResult, TerminalEvent } from "../../api";
import { AgentTimeline, type TimelineStep } from "./AgentTimeline";
import { MessageBubble } from "./MessageBubble";
import { TerminalTranscript, transcriptRunFromAgentRun, transcriptRunsFromEvents } from "./TerminalTranscript";
import { TaskComposer } from "./TaskComposer";

const modeLabels: Record<Mode, string> = {
  full: "Full fix",
  codex: "Codex patch",
  review: "Review diff"
};

const pipelineLabels: Record<Mode, string[]> = {
  full: ["validate", "plan", "patch", "review", "verify"],
  codex: ["validate", "patch", "verify"],
  review: ["validate", "read diff", "review"]
};

const taskTemplates = ["Fix a failing path", "Refactor a module", "Add missing tests", "Review current diff"];

export function ChatWorkspace({
  result,
  mode,
  userTask,
  composerTask,
  testCommand,
  allowTestCommand,
  running,
  canRun,
  needsProjectPath,
  error,
  terminalEvents,
  timeline,
  onTaskChange,
  onTestCommandChange,
  onRun
}: {
  result?: OrchestrationResult;
  mode: Mode;
  userTask?: string;
  composerTask: string;
  testCommand: string;
  allowTestCommand: boolean;
  running: boolean;
  canRun: boolean;
  needsProjectPath: boolean;
  error?: string;
  terminalEvents: TerminalEvent[];
  timeline: TimelineStep[];
  onTaskChange: (value: string) => void;
  onTestCommandChange: (value: string) => void;
  onRun: () => void;
}) {
  const runs = result?.agentRuns ?? [];
  const transcriptRuns = result
    ? runs.map((run) => transcriptRunFromAgentRun(run, result.task.projectPath))
    : transcriptRunsFromEvents(terminalEvents);

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-card/65 shadow-panel backdrop-blur">
      <div className="border-b bg-card/80 px-4 py-3">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[15px] font-semibold">Patch Workspace</div>
                <span className="rounded-full border bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">{modeLabels[mode]}</span>
                <span className="rounded-full border bg-muted/35 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{running ? "running" : result ? "complete" : "idle"}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">diff-first repair pipeline</div>
            </div>
            <div className="min-w-0 xl:w-[34rem]">
              <AgentTimeline steps={timeline} />
            </div>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          {!userTask && runs.length === 0 && !error ? (
            <div className="overflow-hidden rounded-lg border bg-card/88 shadow-panel">
              <div className="border-b bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_38%),hsl(var(--background)/0.46)] px-5 py-4">
                <div className="font-mono text-[11px] uppercase text-primary">Workbench online</div>
                <h1 className="mt-2 text-2xl font-semibold">Describe the code repair.</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Target a repository, choose a repair mode, and run a patch with an optional verifier.
                </p>
              </div>
              <div className="grid gap-0 text-sm md:grid-cols-[1.2fr_0.8fr]">
                <div className="border-b p-5 md:border-b-0 md:border-r">
                  <div className="font-mono text-[11px] uppercase text-muted-foreground">Task templates</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {taskTemplates.map((template) => (
                      <div key={template} className="rounded-md border bg-muted/25 px-3 py-2 font-mono text-xs">
                        {template}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <div className="font-mono text-[11px] uppercase text-muted-foreground">Quick start</div>
                  <div className="mt-3 space-y-2">
                    {["choose folder", "set token", "pick mode", "describe task"].map((label, index) => (
                      <div key={label} className="flex items-center gap-3 font-mono text-xs">
                        <span className="flex h-6 w-6 items-center justify-center rounded border bg-background text-[10px] text-primary">
                          {index + 1}
                        </span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 font-mono text-[11px] uppercase text-muted-foreground">Active pipeline</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pipelineLabels[mode].map((label) => (
                      <span key={label} className="rounded border bg-muted/25 px-2 py-1 font-mono text-[11px]">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {userTask ? <MessageBubble kind="user" body={userTask} /> : null}
          {transcriptRuns.map((run) => (
            <TerminalTranscript key={run.id} run={run} />
          ))}
          {result?.message ? <MessageBubble kind="system" title="Final summary" body={result.message} /> : null}
          {result && !result.message ? (
            <MessageBubble kind="system" title="Final summary" body={`Status: ${result.status}\nChanged files: ${result.changedFiles.length}`} />
          ) : null}
          {error ? <MessageBubble kind="system" title="Error" body={error} /> : null}
        </div>
      </div>
      <TaskComposer
        task={composerTask}
        testCommand={testCommand}
        allowTestCommand={allowTestCommand}
        running={running}
        canRun={canRun}
        needsProjectPath={needsProjectPath}
        onTaskChange={onTaskChange}
        onTestCommandChange={onTestCommandChange}
        onRun={onRun}
      />
    </main>
  );
}
