import { Play, Terminal } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

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
  return (
    <div className="border-t bg-card/90 p-4 backdrop-blur">
      <div className="mx-auto max-w-4xl space-y-3">
        <Textarea
          value={task}
          onChange={(event) => onTaskChange(event.target.value)}
          placeholder={needsProjectPath ? "Describe the code change or repair task..." : "Ask about code, architecture, debugging, or anything else..."}
          disabled={running}
          className="min-h-24 border-border/80 bg-background/80 text-[15px] shadow-sm"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={testCommand}
            onChange={(event) => onTestCommandChange(event.target.value)}
            placeholder={allowTestCommand ? "Optional package script: test, build, typecheck, or lint" : "Review mode does not run package scripts"}
            disabled={running || !allowTestCommand}
            className="font-mono text-xs"
          />
          <Button className="sm:w-36" onClick={onRun} disabled={running || !canRun}>
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
