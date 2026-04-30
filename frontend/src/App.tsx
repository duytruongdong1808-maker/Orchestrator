import { useEffect, useMemo, useState } from "react";
import { api, type CliStatus, type Mode, type OrchestrationResult, type Task } from "./api";
import { ChatWorkspace } from "./components/chat/ChatWorkspace";
import type { TimelineStep } from "./components/chat/AgentTimeline";
import { AppShell } from "./components/layout/AppShell";
import { RightPanel } from "./components/layout/RightPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";

function timelineFor(mode: Mode, running: boolean, result?: OrchestrationResult, error?: string): TimelineStep[] {
  const labels = mode === "chat" ? ["Receive", "Think", "Reply"] : ["Validate", "Plan", "Implement", "Review", "Test"];
  if (error) return labels.map((label, index) => ({ label, status: index === 0 ? "failed" : "pending" }));
  if (running) {
    return labels.map((label, index) => ({ label, status: index === 0 ? "running" : "pending" }));
  }
  if (result) {
    const failed = result.status === "failed";
    return labels.map((label) => ({ label, status: failed ? "failed" : "complete" }));
  }
  return labels.map((label) => ({ label, status: "pending" }));
}

export default function App() {
  const [projectPath, setProjectPath] = useState("");
  const [mode, setMode] = useState<Mode>("full");
  const [task, setTask] = useState("");
  const [lastUserTask, setLastUserTask] = useState("");
  const [testCommand, setTestCommand] = useState("");
  const [cliStatus, setCliStatus] = useState<CliStatus>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [result, setResult] = useState<OrchestrationResult>();
  const [running, setRunning] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [checkingCli, setCheckingCli] = useState(false);
  const [error, setError] = useState<string>();
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    api.listTasks().then(setTasks).catch(() => undefined);
  }, []);

  const timeline = useMemo(() => timelineFor(mode, running, result, error), [mode, running, result, error]);

  async function checkCli() {
    setCheckingCli(true);
    setError(undefined);
    try {
      setCliStatus(await api.checkCli(projectPath));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check CLI status.");
    } finally {
      setCheckingCli(false);
    }
  }

  async function run() {
    if (mode !== "chat" && !projectPath.trim()) {
      setError("Enter a project path before running orchestration.");
      return;
    }

    setRunning(true);
    setError(undefined);
    setResult(undefined);
    setLastUserTask(task);
    try {
      const response = await api.orchestrate({ projectPath, userTask: task, testCommand, mode });
      setResult(response);
      setTasks(await api.listTasks());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed.");
    } finally {
      setRunning(false);
    }
  }

  async function selectTask(selected: Task) {
    setProjectPath(selected.projectPath);
    setTask(selected.userTask);
    setLastUserTask(selected.userTask);
    setTestCommand(selected.testCommand ?? "");
    setMode(selected.mode);
    setError(undefined);
    const detail = await api.getTask(selected.id);
    const finalDiff = detail.diffs[detail.diffs.length - 1]?.diffText ?? "";
    setResult({
      task: detail.task,
      agentRuns: detail.agentRuns,
      diffs: detail.diffs,
      finalDiff,
      changedFiles: [],
      status: detail.task.status
    });
  }

  async function approve() {
    if (!result) return;
    setBusyAction(true);
    try {
      const updated = await api.approve(result.task.id);
      setResult({ ...result, task: updated, status: updated.status });
      setTasks(await api.listTasks());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setBusyAction(false);
    }
  }

  async function rollback() {
    if (!result) return;
    setBusyAction(true);
    try {
      const updated = await api.rollback(result.task.id);
      setResult({ ...result, task: updated, status: updated.status, finalDiff: "", changedFiles: [] });
      setTasks(await api.listTasks());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rollback failed.");
    } finally {
      setBusyAction(false);
    }
  }

  return (
    <AppShell
      topBar={<TopBar projectPath={projectPath} dark={dark} onToggleTheme={() => setDark((value) => !value)} />}
      sidebar={
        <Sidebar
          projectPath={projectPath}
          mode={mode}
          tasks={tasks}
          cliStatus={cliStatus}
          checkingCli={checkingCli}
          onProjectPathChange={setProjectPath}
          onModeChange={setMode}
          onCheckCli={checkCli}
          onSelectTask={selectTask}
        />
      }
      rightPanel={<RightPanel result={result} onApprove={approve} onRollback={rollback} busy={busyAction} />}
    >
      <ChatWorkspace
        result={result}
        userTask={lastUserTask}
        composerTask={task}
        testCommand={testCommand}
        running={running}
        canRun={Boolean(task.trim() && (mode === "chat" || projectPath.trim()))}
        needsProjectPath={mode !== "chat"}
        error={error}
        timeline={timeline}
        onTaskChange={setTask}
        onTestCommandChange={setTestCommand}
        onRun={run}
      />
    </AppShell>
  );
}
