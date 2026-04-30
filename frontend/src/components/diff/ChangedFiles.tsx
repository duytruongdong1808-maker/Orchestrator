import { FileCode2 } from "lucide-react";

export function ChangedFiles({ files }: { files: string[] }) {
  if (files.length === 0) {
    return <div className="rounded-lg border bg-background/45 p-4 text-sm text-muted-foreground">No changed files.</div>;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div key={file} className="flex items-center gap-2 rounded-lg border bg-background/45 px-3 py-2 text-sm">
          <FileCode2 className="h-4 w-4 text-primary" />
          <span className="truncate font-mono text-xs">{file}</span>
        </div>
      ))}
    </div>
  );
}
