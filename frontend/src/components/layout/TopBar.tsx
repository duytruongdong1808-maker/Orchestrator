import { Braces, Copy, Moon, PanelLeft, PanelRight, Sun } from "lucide-react";
import { Button } from "../ui/button";

export function TopBar({
  projectPath,
  dark,
  sidebarOpen,
  inspectorOpen,
  onToggleSidebar,
  onToggleInspector,
  onToggleTheme
}: {
  projectPath: string;
  dark: boolean;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  onToggleSidebar: () => void;
  onToggleInspector: () => void;
  onToggleTheme: () => void;
}) {
  const parts = projectPath.split(/[\\/]/).filter(Boolean);
  const projectName = projectPath ? parts[parts.length - 1] : "No project selected";
  const parentPath = projectPath && parts.length > 1 ? parts.slice(0, -1).join("/") : "";

  function copyProjectPath() {
    if (projectPath) void navigator.clipboard?.writeText(projectPath);
  }

  return (
    <header className="z-50 flex h-14 items-center justify-between border-b bg-background/88 px-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
          <PanelLeft className="h-4 w-4" />
        </Button>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-card shadow-sm">
          <Braces className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 pr-2">
          <div className="text-sm font-semibold">Code Orchestrator</div>
          <div className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground" title={projectPath || undefined}>
            {parentPath ? <span className="min-w-0 truncate">{parentPath}/</span> : null}
            <span className="min-w-0 truncate font-semibold text-foreground">{projectName}</span>
            {projectPath ? (
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
                onClick={copyProjectPath}
                title="Copy project path"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button className="border bg-card shadow-sm" variant="ghost" size="icon" onClick={onToggleTheme} title="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleInspector} title={inspectorOpen ? "Hide inspector" : "Show inspector"}>
          <PanelRight className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
