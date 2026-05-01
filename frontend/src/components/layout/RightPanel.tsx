import { FileDiff } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import type { OrchestrationResult } from "../../api";
import { cn } from "../../lib/utils";
import { ChangedFiles } from "../diff/ChangedFiles";
import { DiffViewer } from "../diff/DiffViewer";
import { TestResultPanel } from "../panels/TestResultPanel";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

type Tab = "diff" | "files" | "tests";
const tabs: Tab[] = ["diff", "files", "tests"];

function statusTone(status?: string) {
  if (!status) return "border-border bg-muted text-muted-foreground";
  if (status === "failed") return "border-red-400/40 bg-red-500/10 text-red-500 dark:text-red-300";
  if (status === "tests_failed") return "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-300";
  if (status === "completed") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  return "border-primary/35 bg-primary/10 text-primary";
}

export function RightPanel({
  result
}: {
  result?: OrchestrationResult;
}) {
  const [tab, setTab] = useState<Tab>("diff");
  const diffLineCount = result?.finalDiff ? result.finalDiff.split("\n").length : 0;
  const changedFileCount = result?.changedFiles?.length ?? 0;
  const testExitCode = result?.testResult?.exitCode;

  function handleTabsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = tabs.indexOf(tab);
    const nextIndex = event.key === "ArrowRight" ? (currentIndex + 1) % tabs.length : (currentIndex - 1 + tabs.length) % tabs.length;
    setTab(tabs[nextIndex]);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-lg border bg-card/92 shadow-panel backdrop-blur">
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <FileDiff className="h-4 w-4 text-primary" />
            Patch Inspector
          </div>
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px]", statusTone(result?.status))}>
            {result?.status ?? "waiting"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <span><span className="text-foreground">{changedFileCount}</span> files</span>
          <span><span className="text-foreground">{diffLineCount}</span> diff lines</span>
          <span>verify <span className="text-foreground">{testExitCode === undefined ? "-" : `exit ${testExitCode ?? "?"}`}</span></span>
        </div>
      </div>
      <Tabs className="min-h-0 flex-1">
        <TabsList className="sticky top-0 z-10 mx-3 mt-3 grid-cols-3 bg-muted/95" aria-label="Patch inspector tabs" onKeyDown={handleTabsKeyDown}>
          <TabsTrigger active={tab === "diff"} onClick={() => setTab("diff")}>
            Diff
          </TabsTrigger>
          <TabsTrigger active={tab === "files"} onClick={() => setTab("files")}>
            Files
          </TabsTrigger>
          <TabsTrigger active={tab === "tests"} onClick={() => setTab("tests")}>
            Tests
          </TabsTrigger>
        </TabsList>
        <div className="min-h-0 flex-1 overflow-hidden p-3">
          {tab === "diff" ? <DiffViewer diff={result?.finalDiff} /> : null}
          {tab === "files" ? <ChangedFiles files={result?.changedFiles ?? []} /> : null}
          {tab === "tests" ? <TestResultPanel output={result?.testResult?.output} exitCode={result?.testResult?.exitCode} /> : null}
        </div>
      </Tabs>
    </aside>
  );
}
