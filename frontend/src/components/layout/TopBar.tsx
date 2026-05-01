import { Braces, Moon, Sun } from "lucide-react";
import { Button } from "../ui/button";

export function TopBar({
  projectPath,
  dark,
  onToggleTheme
}: {
  projectPath: string;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const parts = projectPath.split(/[\\/]/).filter(Boolean);
  const projectName = projectPath ? parts[parts.length - 1] : "No project selected";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/72 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-card shadow-sm">
          <Braces className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Code Orchestrator</div>
          <div className="truncate font-mono text-xs text-muted-foreground">{projectName}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button className="border bg-card shadow-sm" variant="ghost" size="icon" onClick={onToggleTheme} title="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
