import type { ReactNode } from "react";

export function AppShell({ topBar, sidebar, children, rightPanel }: { topBar: ReactNode; sidebar: ReactNode; children: ReactNode; rightPanel: ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden text-foreground">
      {topBar}
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
        {sidebar}
        {children}
        {rightPanel}
      </div>
    </div>
  );
}
