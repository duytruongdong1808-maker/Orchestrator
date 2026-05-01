import { FileDiff, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { OrchestrationResult } from "../../api";
import { ChangedFiles } from "../diff/ChangedFiles";
import { DiffViewer } from "../diff/DiffViewer";
import { TestResultPanel } from "../panels/TestResultPanel";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

type Tab = "diff" | "files" | "tests";

export function RightPanel({
  result,
  onApprove,
  onRollback,
  busy
}: {
  result?: OrchestrationResult;
  onApprove: () => void;
  onRollback: () => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState<Tab>("diff");
  const canAct = Boolean(result?.task?.id);
  const canRollback = Boolean(result?.task?.baseHead && (result.task.mode === "full" || result.task.mode === "codex"));
  const diffLineCount = result?.finalDiff ? result.finalDiff.split("\n").length : 0;
  const changedFileCount = result?.changedFiles?.length ?? 0;
  const testExitCode = result?.testResult?.exitCode;

  return (
    <aside className="flex w-[28rem] shrink-0 flex-col overflow-hidden rounded-lg border bg-card/78 shadow-soft backdrop-blur">
      <div className="border-b px-4 py-4">
        <div>
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <FileDiff className="h-4 w-4 text-primary" />
            Patch Inspector
          </div>
          <div className="font-mono text-xs text-muted-foreground">{result?.status ?? "waiting_for_run"}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-md border bg-background/45 px-2.5 py-2">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Files</div>
            <div className="mt-1 font-mono text-sm">{changedFileCount}</div>
          </div>
          <div className="rounded-md border bg-background/45 px-2.5 py-2">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Diff lines</div>
            <div className="mt-1 font-mono text-sm">{diffLineCount}</div>
          </div>
          <div className="rounded-md border bg-background/45 px-2.5 py-2">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Verify</div>
            <div className="mt-1 font-mono text-sm">{testExitCode === undefined ? "-" : `exit ${testExitCode ?? "?"}`}</div>
          </div>
        </div>
      </div>
      <Tabs className="min-h-0 flex-1 p-3">
        <TabsList className="mb-3 grid-cols-3">
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
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "diff" ? <DiffViewer diff={result?.finalDiff} /> : null}
          {tab === "files" ? <ChangedFiles files={result?.changedFiles ?? []} /> : null}
          {tab === "tests" ? <TestResultPanel output={result?.testResult?.output} exitCode={result?.testResult?.exitCode} /> : null}
        </div>
      </Tabs>
      <div className="border-t p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onApprove} disabled={!canAct || busy}>
            <ShieldCheck className="h-4 w-4" />
            Approve
          </Button>
          <Button variant="danger" onClick={onRollback} disabled={!canAct || !canRollback || busy}>
            <RotateCcw className="h-4 w-4" />
            Rollback
          </Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Rollback discards tracked changes and deletes untracked files from the selected task repository.
        </p>
      </div>
    </aside>
  );
}
