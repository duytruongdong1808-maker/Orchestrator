import type { AgentRun, OrchestrationResult } from "../../api";
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
  if (run.phase === "chat") return "Chat Agent";
  if (run.phase === "test") return "Test Result";
  return "System";
}

export function ChatWorkspace({
  result,
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
              <div className="text-[15px] font-semibold">Conversation</div>
              <div className="text-xs text-muted-foreground">Chat, plan, implement, review, then inspect the diff.</div>
            </div>
            {result ? <div className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">{result.status}</div> : null}
          </div>
          <AgentTimeline steps={timeline} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {!userTask && runs.length === 0 && !error ? (
            <div className="rounded-lg border bg-card/86 p-8 shadow-soft">
              <div className="max-w-xl">
                <h1 className="text-2xl font-semibold">Ready when you are.</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use Chat for everyday questions, or choose a code mode to coordinate planning, implementation, review, and test results.
                </p>
              </div>
              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="font-medium">Chat</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">Ask without touching files.</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="font-medium">Code</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">Run a local repair workflow.</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="font-medium">Review</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">Inspect diffs before approval.</div>
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
