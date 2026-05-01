import type { AgentRun, Mode, OrchestrationResult } from "../../api";
import { AgentTimeline, type TimelineStep } from "./AgentTimeline";
import { MessageBubble, type MessageKind } from "./MessageBubble";
import { TaskComposer } from "./TaskComposer";

function kindForRun(run: AgentRun): MessageKind {
  if (run.agentName.toLowerCase().includes("codex")) return "codex";
  if (run.agentName.toLowerCase().includes("claude")) return "claude";
  return "system";
}

function titleForRun(run: AgentRun) {
  if (run.agentName.toLowerCase().includes("codex")) {
    return run.phase === "revision" ? "Implementation Agent revision" : "Implementation Agent";
  }
  if (run.phase === "planning") return "Planning Agent";
  if (run.phase === "review") return "Review Agent";
  if (run.phase === "chat") return "Legacy Chat Agent";
  if (run.phase === "test") return "Test Result";
  return "System";
}

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
  projectPath,
  userTask,
  composerTask,
  testCommand,
  allowTestCommand,
  running,
  canRun,
  needsProjectPath,
  error,
  timeline,
  onTaskChange,
  onTestCommandChange,
  onRun
}: {
  result?: OrchestrationResult;
  mode: Mode;
  projectPath: string;
  userTask?: string;
  composerTask: string;
  testCommand: string;
  allowTestCommand: boolean;
  running: boolean;
  canRun: boolean;
  needsProjectPath: boolean;
  error?: string;
  timeline: TimelineStep[];
  onTaskChange: (value: string) => void;
  onTestCommandChange: (value: string) => void;
  onRun: () => void;
}) {
  const runs = result?.agentRuns ?? [];

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card/55 shadow-soft backdrop-blur">
      <div className="border-b bg-card/72 px-5 py-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold">Patch Workspace</div>
              <div className="font-mono text-xs text-muted-foreground">{modeLabels[mode]} / diff-first repair pipeline</div>
            </div>
            {result ? <div className="rounded-md border bg-muted/40 px-3 py-1 font-mono text-xs text-muted-foreground">{result.status}</div> : null}
          </div>
          <AgentTimeline steps={timeline} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {!userTask && runs.length === 0 && !error ? (
            <div className="overflow-hidden rounded-lg border bg-card/86 shadow-soft">
              <div className="border-b bg-background/40 px-5 py-4">
                <div className="font-mono text-[11px] uppercase text-primary">Workbench online</div>
                <h1 className="mt-2 text-2xl font-semibold">Describe the code repair.</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Target a repository, choose a repair mode, and run a patch with an optional verifier.
                </p>
              </div>
              <div className="grid gap-0 text-sm md:grid-cols-[1.2fr_0.8fr]">
                <div className="border-b p-5 md:border-b-0 md:border-r">
                  <div className="font-mono text-[11px] uppercase text-muted-foreground">Selected repository</div>
                  <div className="mt-2 truncate font-mono text-sm">{projectPath || "No repository selected"}</div>
                  <div className="mt-5 font-mono text-[11px] uppercase text-muted-foreground">Task templates</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {taskTemplates.map((template) => (
                      <div key={template} className="rounded-md border bg-muted/25 px-3 py-2 font-mono text-xs">
                        {template}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <div className="font-mono text-[11px] uppercase text-muted-foreground">Active pipeline</div>
                  <div className="mt-3 space-y-2">
                    {pipelineLabels[mode].map((label, index) => (
                      <div key={label} className="flex items-center gap-3 font-mono text-xs">
                        <span className="flex h-6 w-6 items-center justify-center rounded border bg-background text-[10px] text-primary">
                          {index + 1}
                        </span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {userTask ? <MessageBubble kind="user" body={userTask} /> : null}
          {runs.map((run) => (
            <MessageBubble
              key={run.id}
              kind={kindForRun(run)}
              title={titleForRun(run)}
              body={run.output || "(no output)"}
            />
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
