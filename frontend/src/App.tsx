import { useEffect, useMemo, useState } from "react";
import { api, getStoredApiToken, setStoredApiToken, type CliStatus, type Mode, type OrchestrationResult, type Task, type TerminalEvent } from "./api";
import { ChatWorkspace } from "./components/chat/ChatWorkspace";
import type { TimelineStep } from "./components/chat/AgentTimeline";
import { AppShell } from "./components/layout/AppShell";
import { RightPanel } from "./components/layout/RightPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";

const SIDEBAR_OPEN_KEY = "orchestrator.sidebarOpen";
const INSPECTOR_OPEN_KEY = "orchestrator.inspectorOpen";

function getStoredPanelState(key: string) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    // Storage can be unavailable in private/sandboxed browser contexts.
  }
  return window.matchMedia?.("(min-width: 1024px)")?.matches ?? true;
}

function storePanelState(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore persistence failures; panel state still works for this session.
  }
}

function mergeTasks(...taskLists: Task[][]) {
  const byId = new Map<string, Task>();
  for (const task of taskLists.flat()) {
    byId.set(task.id, task);
  }
  return [...byId.values()].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function timelineFor(mode: Mode, running: boolean, result?: OrchestrationResult, error?: string): TimelineStep[] {
  const labels =
    mode === "review"
      ? ["Validate", "Read diff", "Review"]
      : mode === "codex"
        ? ["Validate", "Patch", "Verify"]
        : ["Validate", "Plan", "Patch", "Review", "Verify"];
  if (error) return labels.map((label, index) => ({ label, status: index === 0 ? "failed" : "pending" }));
  if (running) {
    return labels.map((label, index) => ({ label, status: index === 0 ? "running" : "pending" }));
  }
  if (result) {
    if (result.status === "tests_failed") {
      return labels.map((label) => ({ label, status: label === "Verify" ? "failed" : "complete" }));
    }
    const failed = result.status === "failed";
    return labels.map((label) => ({ label, status: failed ? "failed" : "complete" }));
  }
  return labels.map((label) => ({ label, status: "pending" }));
}

export default function App() {
  const [projectPath, setProjectPath] = useState("");
  const [apiToken, setApiToken] = useState(getStoredApiToken);
  const [mode, setMode] = useState<Mode>("full");
  const [task, setTask] = useState("");
  const [lastUserTask, setLastUserTask] = useState("");
  const [testCommand, setTestCommand] = useState("");
  const [cliStatus, setCliStatus] = useState<CliStatus>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [result, setResult] = useState<OrchestrationResult>();
  const [terminalEvents, setTerminalEvents] = useState<TerminalEvent[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [running, setRunning] = useState(false);
  const [checkingCli, setCheckingCli] = useState(false);
  const [error, setError] = useState<string>();
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false);
  const [sidebarOpen, setSidebarOpen] = useState(() => getStoredPanelState(SIDEBAR_OPEN_KEY));
  const [inspectorOpen, setInspectorOpen] = useState(() => getStoredPanelState(INSPECTOR_OPEN_KEY));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    storePanelState(SIDEBAR_OPEN_KEY, sidebarOpen);
  }, [sidebarOpen]);

  useEffect(() => {
    storePanelState(INSPECTOR_OPEN_KEY, inspectorOpen);
  }, [inspectorOpen]);

  useEffect(() => {
    if (!apiToken) {
      setTasks([]);
      return;
    }
    api.listTasks().then(setTasks).catch(() => undefined);
  }, [apiToken]);

  useEffect(() => {
    if (!apiToken || !projectPath.trim()) return;

    const timeout = window.setTimeout(() => {
      api.listTasks(projectPath).then((projectTasks) => setTasks((current) => mergeTasks(current, projectTasks))).catch(() => undefined);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [apiToken, projectPath]);

  const timeline = useMemo(() => timelineFor(mode, running, result, error), [mode, running, result, error]);

  function updateApiToken(value: string) {
    setApiToken(value);
    setStoredApiToken(value);
  }

  function isSafeTestCommandSelection(command: string) {
    return /^(build|test|typecheck|lint)$/i.test(command.trim()) || /^(?:npm|pnpm|yarn)\s+(?:run\s+)?(build|test|typecheck|lint)$/i.test(command.trim());
  }

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
    if (!projectPath.trim()) {
      setError("Enter a project path before running orchestration.");
      return;
    }
    if (mode === "review" && testCommand.trim()) {
      setError("Review mode does not run test commands. Clear the package script selection first.");
      return;
    }
    if (testCommand.trim() && !isSafeTestCommandSelection(testCommand)) {
      setError("Test command must be one of: build, test, typecheck, lint, or an equivalent npm/pnpm/yarn run command.");
      return;
    }

    setRunning(true);
    setError(undefined);
    setResult(undefined);
    setTerminalEvents([]);
    setSelectedTaskId(undefined);
    setLastUserTask(task);
    try {
      const response = await api.orchestrateStream(
        { projectPath, userTask: task, testCommand: mode === "review" ? "" : testCommand, mode },
        (event) => setTerminalEvents((current) => [...current, event])
      );
      setResult(response);
      setSelectedTaskId(response.task.id);
      const [allTasks, projectTasks] = await Promise.all([api.listTasks(), api.listTasks(projectPath)]);
      setTasks(mergeTasks(allTasks, projectTasks));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed.");
    } finally {
      setRunning(false);
    }
  }

  async function selectTask(selected: Task) {
    setError(undefined);
    setTerminalEvents([]);
    try {
      const detail = await api.getTask(selected.id);
      const finalDiff = detail.diffs[detail.diffs.length - 1]?.diffText ?? "";
      setProjectPath(detail.task.projectPath);
      setTask(detail.task.userTask);
      setLastUserTask(detail.task.userTask);
      setTestCommand(detail.task.testCommand ?? "");
      setMode(detail.task.mode === "chat" ? "full" : detail.task.mode);
      setSelectedTaskId(detail.task.id);
      setResult({
        task: detail.task,
        agentRuns: detail.agentRuns,
        diffs: detail.diffs,
        finalDiff,
        changedFiles: detail.changedFiles,
        testResult: detail.testResult,
        status: detail.task.status
      });
    } catch (err) {
      setSelectedTaskId(undefined);
      setError(err instanceof Error ? err.message : "Unable to open patch history item.");
    }
  }

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      inspectorOpen={inspectorOpen}
      onCloseSidebar={() => setSidebarOpen(false)}
      onCloseInspector={() => setInspectorOpen(false)}
      topBar={
        <TopBar
          projectPath={projectPath}
          dark={dark}
          sidebarOpen={sidebarOpen}
          inspectorOpen={inspectorOpen}
          onToggleSidebar={() => setSidebarOpen((value) => !value)}
          onToggleInspector={() => setInspectorOpen((value) => !value)}
          onToggleTheme={() => setDark((value) => !value)}
        />
      }
      sidebar={
        <Sidebar
          projectPath={projectPath}
          apiToken={apiToken}
          mode={mode}
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          cliStatus={cliStatus}
          checkingCli={checkingCli}
          onProjectPathChange={setProjectPath}
          onApiTokenChange={updateApiToken}
          onModeChange={setMode}
          onCheckCli={checkCli}
          onSelectTask={selectTask}
        />
      }
      rightPanel={<RightPanel result={result} />}
    >
      <ChatWorkspace
        result={result}
        mode={mode}
        userTask={lastUserTask}
        composerTask={task}
        testCommand={testCommand}
        allowTestCommand={mode !== "review"}
        running={running}
        canRun={Boolean(task.trim() && projectPath.trim())}
        needsProjectPath
        error={error}
        terminalEvents={terminalEvents}
        timeline={timeline}
        onTaskChange={setTask}
        onTestCommandChange={setTestCommand}
        onRun={run}
      />
    </AppShell>
  );
}
