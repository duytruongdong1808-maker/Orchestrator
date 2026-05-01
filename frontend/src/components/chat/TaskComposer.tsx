import { Bug, FlaskConical, GitPullRequest, Play, RefreshCw, Terminal } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

const presets = [
  {
    label: "Fix bug",
    icon: Bug,
    prompt: "Fix the bug described below. Keep the patch minimal, preserve existing behavior, and add or update focused tests when appropriate:\n\n"
  },
  {
    label: "Refactor safely",
    icon: RefreshCw,
    prompt: "Refactor the code described below without changing user-visible behavior. Keep the diff small and call out any risky assumptions:\n\n"
  },
  {
    label: "Add tests",
    icon: FlaskConical,
    prompt: "Add or repair tests for the behavior described below. Prefer focused coverage over broad rewrites:\n\n"
  },
  {
    label: "Review diff",
    icon: GitPullRequest,
    prompt: "Review the current git diff for correctness, regressions, missing tests, and unsafe changes. Prioritize actionable findings:\n\n"
  }
];

const scriptButtons = ["typecheck", "test", "build", "lint"];

export function TaskComposer({
  task,
  testCommand,
  allowTestCommand,
  running,
  canRun,
  needsProjectPath,
  onTaskChange,
  onTestCommandChange,
  onRun
}: {
  task: string;
  testCommand: string;
  allowTestCommand: boolean;
  running: boolean;
  canRun: boolean;
  needsProjectPath: boolean;
  onTaskChange: (value: string) => void;
  onTestCommandChange: (value: string) => void;
  onRun: () => void;
}) {
  function applyPreset(prompt: string) {
    onTaskChange(task.trim() ? `${task.trim()}\n\n${prompt}` : prompt);
  }

  return (
    <div className="border-t bg-card/90 p-4 backdrop-blur">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const Icon = preset.icon;
            return (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.prompt)}
                disabled={running}
                className="border-border/80 bg-background/70 font-mono text-[11px]"
              >
                <Icon className="h-3.5 w-3.5" />
                {preset.label}
              </Button>
            );
          })}
        </div>
        <Textarea
          value={task}
          onChange={(event) => onTaskChange(event.target.value)}
          placeholder="Describe the bug, refactor, failing test, or diff review goal..."
          disabled={running}
          className="min-h-28 border-border/80 bg-background/80 font-mono text-[13px] shadow-inner"
        />
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row">
            <Input
              value={testCommand}
              onChange={(event) => onTestCommandChange(event.target.value)}
              placeholder={allowTestCommand ? "Optional verifier: typecheck, test, build, or lint" : "Review diff mode does not run package scripts"}
              disabled={running || !allowTestCommand}
              className="font-mono text-xs"
            />
            <div className="flex shrink-0 flex-wrap gap-1.5">
              {scriptButtons.map((script) => (
                <Button
                  key={script}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onTestCommandChange(script)}
                  disabled={running || !allowTestCommand}
                  className="h-10 border border-border/70 bg-muted/35 font-mono text-[11px]"
                >
                  {script}
                </Button>
              ))}
            </div>
          </div>
          <Button className="w-full xl:w-36" onClick={onRun} disabled={running || !canRun}>
            {needsProjectPath ? <Terminal className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Running" : "Run"}
          </Button>
        </div>
        {!canRun && needsProjectPath && task.trim() ? (
          <div className="text-xs text-muted-foreground">Enter a project path before running orchestration.</div>
        ) : null}
      </div>
    </div>
  );
}
