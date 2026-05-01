import type { CliStatus, Mode, Task } from "../../api";
import { CliStatusPanel } from "../panels/CliStatusPanel";
import { ModeSelector } from "../panels/ModeSelector";
import { ProjectPanel } from "../panels/ProjectPanel";
import { TaskHistory } from "../panels/TaskHistory";

export function Sidebar({
  projectPath,
  apiToken,
  mode,
  tasks,
  selectedTaskId,
  cliStatus,
  checkingCli,
  onProjectPathChange,
  onApiTokenChange,
  onModeChange,
  onCheckCli,
  onSelectTask
}: {
  projectPath: string;
  apiToken: string;
  mode: Mode;
  tasks: Task[];
  selectedTaskId?: string;
  cliStatus?: CliStatus;
  checkingCli: boolean;
  onProjectPathChange: (value: string) => void;
  onApiTokenChange: (value: string) => void;
  onModeChange: (mode: Mode) => void;
  onCheckCli: () => void;
  onSelectTask: (task: Task) => void;
}) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-lg border bg-card/92 shadow-panel backdrop-blur">
      <div className="border-b px-3 py-3">
        <div className="text-[15px] font-semibold">Repair Console</div>
        <div className="font-mono text-xs text-muted-foreground">Local patch orchestration</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        <ProjectPanel
          projectPath={projectPath}
          apiToken={apiToken}
          onProjectPathChange={onProjectPathChange}
          onApiTokenChange={onApiTokenChange}
          onCheckCli={onCheckCli}
          checking={checkingCli}
        />
        <div className="h-px bg-border/70" />
        <CliStatusPanel status={cliStatus} />
        <div className="h-px bg-border/70" />
        <ModeSelector value={mode} onChange={onModeChange} />
        <div className="h-px bg-border/70" />
        <TaskHistory tasks={tasks} currentProjectPath={projectPath} selectedTaskId={selectedTaskId} onSelect={onSelectTask} />
      </div>
    </aside>
  );
}
