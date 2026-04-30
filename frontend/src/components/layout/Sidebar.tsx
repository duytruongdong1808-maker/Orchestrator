import type { CliStatus, Mode, Task } from "../../api";
import { CliStatusPanel } from "../panels/CliStatusPanel";
import { ModeSelector } from "../panels/ModeSelector";
import { ProjectPanel } from "../panels/ProjectPanel";
import { TaskHistory } from "../panels/TaskHistory";

export function Sidebar({
  projectPath,
  mode,
  tasks,
  cliStatus,
  checkingCli,
  onProjectPathChange,
  onModeChange,
  onCheckCli,
  onSelectTask
}: {
  projectPath: string;
  mode: Mode;
  tasks: Task[];
  cliStatus?: CliStatus;
  checkingCli: boolean;
  onProjectPathChange: (value: string) => void;
  onModeChange: (mode: Mode) => void;
  onCheckCli: () => void;
  onSelectTask: (task: Task) => void;
}) {
  return (
    <aside className="flex w-[18.5rem] shrink-0 flex-col overflow-hidden rounded-lg border bg-card/78 shadow-soft backdrop-blur">
      <div className="border-b px-4 py-4">
        <div className="text-[15px] font-semibold">Workspace</div>
        <div className="text-xs text-muted-foreground">Local chat and code repair</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4">
        <ProjectPanel
          projectPath={projectPath}
          onProjectPathChange={onProjectPathChange}
          onCheckCli={onCheckCli}
          checking={checkingCli}
        />
        <CliStatusPanel status={cliStatus} />
        <ModeSelector value={mode} onChange={onModeChange} />
        <TaskHistory tasks={tasks} onSelect={onSelectTask} />
      </div>
    </aside>
  );
}
