import { FolderGit2, RefreshCw } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export function ProjectPanel({
  projectPath,
  onProjectPathChange,
  onCheckCli,
  checking
}: {
  projectPath: string;
  onProjectPathChange: (value: string) => void;
  onCheckCli: () => void;
  checking: boolean;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="project-path">
          Project
        </label>
        <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <Input
        id="project-path"
        value={projectPath}
        onChange={(event) => onProjectPathChange(event.target.value)}
        placeholder="D:\\Projects\\my-app"
        className="font-mono text-xs"
      />
      <Button className="w-full" variant="outline" onClick={onCheckCli} disabled={checking}>
        <RefreshCw className={checking ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        Check CLI
      </Button>
    </section>
  );
}
