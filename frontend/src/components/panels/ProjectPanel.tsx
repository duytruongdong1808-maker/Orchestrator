import { Copy, Eye, EyeOff, FolderGit2, FolderOpen, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { FolderPickerDialog } from "./FolderPickerDialog";

export function ProjectPanel({
  projectPath,
  apiToken,
  onProjectPathChange,
  onApiTokenChange,
  onCheckCli,
  checking
}: {
  projectPath: string;
  apiToken: string;
  onProjectPathChange: (value: string) => void;
  onApiTokenChange: (value: string) => void;
  onCheckCli: () => void;
  checking: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const parts = projectPath.split(/[\\/]/).filter(Boolean);
  const repoName = projectPath ? parts[parts.length - 1] : "No folder selected";
  const parentPath = projectPath && parts.length > 1 ? parts.slice(0, -1).join("/") : "";
  const tokenSet = Boolean(apiToken.trim());

  function copyProjectPath() {
    if (projectPath) void navigator.clipboard?.writeText(projectPath);
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <FolderGit2 className="h-3.5 w-3.5" />
          Repository
        </div>
        <div className="h-px flex-1 bg-border/70" />
      </div>
      <div className="rounded-md border bg-background/55 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-mono text-[11px] text-muted-foreground" title={parentPath || undefined}>
              {parentPath || "Repository path"}
            </div>
            <div className="mt-0.5 truncate font-mono text-sm font-medium" title={projectPath || undefined}>
              {repoName}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyProjectPath} disabled={!projectPath} title="Copy path">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-md border bg-background/45">
        <Button className="w-full rounded-none border-0 bg-transparent" variant="ghost" onClick={() => setPickerOpen(true)}>
          <FolderOpen className="h-4 w-4" />
          Choose folder
        </Button>
        <Button className="rounded-none border-l" variant="ghost" size="icon" onClick={() => onProjectPathChange("")} disabled={!projectPath} title="Clear selected folder">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Local API token</label>
        <div className="relative">
          <span className={tokenSet ? "absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500" : "absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-muted-foreground/45"} />
          <Input
            value={apiToken}
            onChange={(event) => onApiTokenChange(event.target.value)}
            placeholder="Paste token"
            type={showToken ? "text" : "password"}
            autoComplete="off"
            className="px-7 font-mono text-xs"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
            onClick={() => setShowToken((value) => !value)}
            title={showToken ? "Hide token" : "Show token"}
          >
            {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <Button className="h-9 w-full text-xs" variant="outline" onClick={onCheckCli} disabled={checking}>
        <RefreshCw className={checking ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        Check toolchain
      </Button>
      <FolderPickerDialog
        open={pickerOpen}
        selectedPath={projectPath}
        onSelect={onProjectPathChange}
        onClose={() => setPickerOpen(false)}
      />
    </section>
  );
}
