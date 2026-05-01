import { ArrowUp, Check, Folder, HardDrive, Loader2, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type DirectoryEntry, type DirectoryListing } from "../../api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function FolderPickerDialog({
  open,
  selectedPath,
  onSelect,
  onClose
}: {
  open: boolean;
  selectedPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [roots, setRoots] = useState<DirectoryEntry[]>([]);
  const [listing, setListing] = useState<DirectoryListing>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [pastePath, setPastePath] = useState("");

  useEffect(() => {
    if (!open) return;
    setPastePath("");
    setError(undefined);
    setListing(undefined);
    void loadRoots();
  }, [open]);

  async function loadRoots() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await api.filesystemRoots();
      setRoots(response.roots);
      setListing(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load folders.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDirectory(path: string) {
    setLoading(true);
    setError(undefined);
    try {
      setListing(await api.filesystemDirectories(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open folder.");
    } finally {
      setLoading(false);
    }
  }

  function selectPath(path: string) {
    onSelect(path);
    onClose();
  }

  if (!open) return null;

  const directories = listing?.directories ?? roots;
  const currentPath = listing?.path;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/72 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Folder className="h-4 w-4 text-primary" />
              Choose repository folder
            </div>
            <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {currentPath ?? selectedPath ?? "Select a local folder"}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close folder picker">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={loadRoots} disabled={loading}>
            <HardDrive className="h-3.5 w-3.5" />
            Roots
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => listing?.parentPath && loadDirectory(listing.parentPath)} disabled={loading || !listing?.parentPath}>
            <ArrowUp className="h-3.5 w-3.5" />
            Up
          </Button>
          <Button type="button" size="sm" onClick={() => currentPath && selectPath(currentPath)} disabled={!currentPath || loading} className="ml-auto">
            <Check className="h-3.5 w-3.5" />
            Use current
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {error ? <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div> : null}
          {loading ? (
            <div className="flex items-center gap-2 rounded-md border bg-background/45 px-3 py-4 font-mono text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading folders...
            </div>
          ) : directories.length === 0 ? (
            <div className="rounded-md border bg-background/45 px-3 py-4 font-mono text-xs text-muted-foreground">No child folders found.</div>
          ) : (
            <div className="space-y-1">
              {directories.map((directory) => (
                <button
                  key={directory.path}
                  type="button"
                  onClick={() => loadDirectory(directory.path)}
                  className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition hover:border-primary/35 hover:bg-primary/10"
                >
                  {listing ? <Folder className="h-4 w-4 shrink-0 text-primary" /> : <HardDrive className="h-4 w-4 shrink-0 text-primary" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{directory.name}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{directory.path}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t bg-muted/20 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={pastePath}
              onChange={(event) => setPastePath(event.target.value)}
              placeholder="Paste absolute path fallback"
              className="font-mono text-xs"
            />
            <Button type="button" variant="outline" onClick={() => selectPath(pastePath.trim())} disabled={!pastePath.trim()}>
              <MapPin className="h-4 w-4" />
              Use pasted
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
