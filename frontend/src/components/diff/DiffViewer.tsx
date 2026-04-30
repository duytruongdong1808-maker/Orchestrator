export function DiffViewer({ diff }: { diff?: string }) {
  if (!diff?.trim()) {
    return <div className="rounded-lg border bg-background/45 p-4 text-sm text-muted-foreground">No diff to display.</div>;
  }

  return (
    <pre className="min-h-0 overflow-auto rounded-lg border bg-background/75 p-3 font-mono text-xs leading-5 shadow-inner">
      <code>{diff}</code>
    </pre>
  );
}
