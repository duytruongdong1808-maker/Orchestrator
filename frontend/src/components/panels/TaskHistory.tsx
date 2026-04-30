import type { Task } from "../../api";
import { Badge } from "../ui/badge";

export function TaskHistory({ tasks, onSelect }: { tasks: Task[]; onSelect: (task: Task) => void }) {
  return (
    <section className="min-h-0 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</div>
        <div className="text-[11px] text-muted-foreground">{tasks.length}</div>
      </div>
      <div className="max-h-[22rem] space-y-1.5 overflow-auto pr-1">
        {tasks.length === 0 ? (
          <div className="rounded-lg border bg-background/40 px-3 py-4 text-sm text-muted-foreground">No tasks yet.</div>
        ) : (
          tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onSelect(task)}
              className="w-full rounded-lg border bg-background/45 px-3 py-2.5 text-left transition hover:bg-muted/70"
            >
              <div className="line-clamp-2 text-sm font-medium">{task.userTask}</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Badge tone={task.status === "failed" ? "bad" : task.status === "tests_failed" ? "warn" : "neutral"}>
                  {task.status}
                </Badge>
                <span className="truncate text-[11px] text-muted-foreground">{new Date(task.createdAt).toLocaleString()}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
