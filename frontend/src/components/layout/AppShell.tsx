import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function AppShell({
  topBar,
  sidebar,
  children,
  rightPanel,
  sidebarOpen,
  inspectorOpen,
  onCloseSidebar,
  onCloseInspector
}: {
  topBar: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  rightPanel: ReactNode;
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  onCloseSidebar: () => void;
  onCloseInspector: () => void;
}) {
  const mobilePanelOpen = sidebarOpen || inspectorOpen;

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {topBar}
      <div
        className="relative flex min-h-0 flex-1 overflow-hidden p-2 lg:grid lg:gap-2 lg:transition-[grid-template-columns] lg:duration-200"
        style={{ gridTemplateColumns: `${sidebarOpen ? "17rem" : "0rem"} minmax(0, 1fr) ${inspectorOpen ? "26rem" : "0rem"}` }}
      >
        {mobilePanelOpen ? (
          <button
            type="button"
            aria-label="Close panels"
            className="fixed inset-x-0 bottom-0 top-14 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => {
              onCloseSidebar();
              onCloseInspector();
            }}
          />
        ) : null}
        <div
          className={cn(
            "fixed bottom-2 left-2 top-16 z-40 w-[17rem] max-w-[calc(100vw-1rem)] transition duration-200 lg:static lg:z-auto lg:w-auto lg:max-w-none lg:overflow-hidden lg:transition-opacity",
            sidebarOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-[calc(100%+1rem)] opacity-0 lg:translate-x-0"
          )}
        >
          {sidebar}
        </div>
        <div className="min-h-0 min-w-0 overflow-hidden">{children}</div>
        <div
          className={cn(
            "fixed bottom-2 right-2 top-16 z-40 w-[min(28rem,calc(100vw-1rem))] transition duration-200 lg:static lg:z-auto lg:w-auto lg:overflow-hidden lg:transition-opacity",
            inspectorOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(100%+1rem)] opacity-0 lg:translate-x-0"
          )}
        >
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
