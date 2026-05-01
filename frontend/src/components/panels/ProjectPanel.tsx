import { FolderGit2, FolderOpen, RefreshCw, X } from "lucide-react";
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

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[11px] font-semibold uppercase text-muted-foreground">
          Repository
        </div>
        <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="rounded-md border bg-background/45 px-3 py-2">
        <div className="font-mono text-[10px] uppercase text-muted-foreground">Selected path</div>
        <div className="mt-1 truncate font-mono text-xs">{projectPath || "No folder selected"}</div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button className="w-full" variant="outline" onClick={() => setPickerOpen(true)}>
          <FolderOpen className="h-4 w-4" />
          Choose folder
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onProjectPathChange("")} disabled={!projectPath} title="Clear selected folder">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Input
        value={apiToken}
        onChange={(event) => onApiTokenChange(event.target.value)}
        placeholder="Local API token"
        type="password"
        autoComplete="off"
        className="font-mono text-xs"
      />
      <Button className="w-full" variant="outline" onClick={onCheckCli} disabled={checking}>
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
