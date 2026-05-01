import { FileCode2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "../ui/input";

function splitPath(file: string) {
  const parts = file.split(/[\\/]/).filter(Boolean);
  return {
    name: parts[parts.length - 1] ?? file,
    dir: parts.length > 1 ? parts.slice(0, -1).join("/") : "."
  };
}

export function ChangedFiles({ files }: { files: string[] }) {
  const [query, setQuery] = useState("");
  const filteredFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return files;
    return files.filter((file) => file.toLowerCase().includes(needle));
  }, [files, query]);

  if (files.length === 0) {
    return <div className="rounded-lg border bg-background/45 p-4 font-mono text-xs text-muted-foreground">No changed files.</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="sticky top-0 z-10 bg-card/95 pb-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter files" className="h-8 pl-8 font-mono text-xs" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
        {filteredFiles.length === 0 ? (
          <div className="rounded-lg border bg-background/45 p-4 font-mono text-xs text-muted-foreground">No matching files.</div>
        ) : filteredFiles.map((file) => {
          const path = splitPath(file);
          return (
            <div key={file} className="flex items-start gap-2 rounded-md border bg-background/45 px-3 py-2 text-sm">
              <FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="truncate font-mono text-xs font-semibold">{path.name}</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={file}>{path.dir}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
