import { FolderGit2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Task } from "../../api";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";

type HistoryScope = "current" | "all";

function normalizePath(value: string) {
  return value.trim().toLowerCase();
}

function projectName(projectPath: string) {
  const parts = projectPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? projectPath;
}

function relativeTime(value: string, now: number) {
  const deltaSeconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (deltaSeconds < 60) return "now";
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function statusTone(status: string) {
  if (status === "completed") return "border-emerald-400/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "tests_failed") return "border-amber-400/45 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "failed") return "border-red-400/45 bg-red-500/10 text-red-700 dark:text-red-300";
  if (status === "running") return "border-primary/45 bg-primary/10 text-primary";
  return "border-border bg-muted/45 text-muted-foreground";
}

export function TaskHistory({
  tasks,
  currentProjectPath,
  selectedTaskId,
  onSelect
}: {
  tasks: Task[];
  currentProjectPath: string;
  selectedTaskId?: string;
  onSelect: (task: Task) => void;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<HistoryScope>("current");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const hasCurrentProject = Boolean(currentProjectPath.trim());
  const currentProjectTasks = useMemo(() => {
    const project = normalizePath(currentProjectPath);
    if (!project) return [];
    return tasks.filter((task) => normalizePath(task.projectPath) === project);
  }, [currentProjectPath, tasks]);

  const scopedTasks = scope === "current" ? currentProjectTasks : tasks;
  const filteredTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return scopedTasks;
    return scopedTasks.filter((task) =>
      [task.userTask, task.projectPath, task.status, task.mode, task.testCommand ?? ""].some((field) => field.toLowerCase().includes(needle))
    );
  }, [query, scopedTasks]);

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Patch History</div>
        <div className="font-mono text-[11px] text-muted-foreground">{filteredTasks.length}/{scopedTasks.length}</div>
      </div>
      <div className="grid grid-cols-2 rounded-md border bg-muted p-1">
        <button
          type="button"
          onClick={() => setScope("current")}
          className={cn(
            "rounded px-2 py-1.5 text-xs font-medium text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
            scope === "current" && "bg-card text-foreground shadow-sm"
          )}
          aria-pressed={scope === "current"}
        >
          Current
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">{currentProjectTasks.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          className={cn(
            "rounded px-2 py-1.5 text-xs font-medium text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
            scope === "all" && "bg-card text-foreground shadow-sm"
          )}
          aria-pressed={scope === "all"}
        >
          All
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">{tasks.length}</span>
        </button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter task, repo, mode, status" className="h-8 pl-8 font-mono text-xs" />
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
        {tasks.length === 0 ? (
          <div className="rounded-lg border bg-background/40 px-3 py-4 text-sm text-muted-foreground">No patch runs yet.</div>
        ) : scope === "current" && !hasCurrentProject ? (
          <div className="rounded-lg border bg-background/40 px-3 py-4 text-sm text-muted-foreground">Choose a project to see its runs.</div>
        ) : scopedTasks.length === 0 ? (
          <div className="rounded-lg border bg-background/40 px-3 py-4 text-sm text-muted-foreground">No runs for this project.</div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-lg border bg-background/40 px-3 py-4 text-sm text-muted-foreground">No matching runs.</div>
        ) : (
          filteredTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onSelect(task)}
              className={cn(
                "w-full rounded-md border bg-background/45 px-3 py-2 text-left transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
                task.id === selectedTaskId && "border-primary/60 bg-primary/10 shadow-sm"
              )}
              aria-current={task.id === selectedTaskId ? "true" : undefined}
            >
              <div className="line-clamp-2 text-[13px] font-medium leading-5">{task.userTask}</div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full border px-1.5 py-0.5 font-mono text-[10px]", statusTone(task.status))}>{task.status}</span>
                <span className="rounded-full border bg-muted/35 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {task.mode === "chat" ? "legacy" : task.mode}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{relativeTime(task.createdAt, now)}</span>
              </div>
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                <FolderGit2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" title={task.projectPath}>
                  {scope === "all" ? projectName(task.projectPath) : task.projectPath}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
