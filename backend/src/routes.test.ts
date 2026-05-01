import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import express from "express";
import { database } from "./db/database.js";
import { requireApiToken, router } from "./routes.js";

function pathEnvKey() {
  return Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
}

async function withFakeClaude(run: () => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "orchestrator-claude-"));
  const shellPath = path.join(dir, "claude");
  const cmdPath = path.join(dir, "claude.cmd");

  await fs.writeFile(shellPath, "#!/bin/sh\ncat >/dev/null\necho \"claude live stdout\"\necho \"claude live stderr\" >&2\n");
  await fs.chmod(shellPath, 0o755);
  await fs.writeFile(cmdPath, "@echo off\r\nmore > nul\r\necho claude live stdout\r\necho claude live stderr 1>&2\r\n");

  const key = pathEnvKey();
  const originalPath = process.env[key];
  process.env[key] = `${dir}${path.delimiter}${originalPath ?? ""}`;

  try {
    await run();
  } finally {
    process.env[key] = originalPath;
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function readNdjson(response: Response) {
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, any>);
}

async function withProtectedServer(run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.get("/protected", requireApiToken, (_req, res) => {
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function withRouterServer(run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: message });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("protected route rejects a missing token", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";

  await withProtectedServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/protected`);
    assert.equal(response.status, 401);
  });
});

test("protected route rejects a wrong token", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";

  await withProtectedServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/protected`, {
      headers: { "x-orchestrator-token": "wrong-token" }
    });
    assert.equal(response.status, 401);
  });
});

test("protected route accepts the configured token", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";

  await withProtectedServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/protected`, {
      headers: { "x-orchestrator-token": "correct-token" }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test("filesystem roots reject a missing token", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";

  await withRouterServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fs/roots`);
    assert.equal(response.status, 401);
  });
});

test("filesystem roots reject a wrong token", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";

  await withRouterServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fs/roots`, {
      headers: { "x-orchestrator-token": "wrong-token" }
    });
    assert.equal(response.status, 401);
  });
});

test("filesystem roots returns at least one usable root", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";

  await withRouterServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fs/roots`, {
      headers: { "x-orchestrator-token": "correct-token" }
    });
    assert.equal(response.status, 200);

    const body = (await response.json()) as { roots: Array<{ name: string; path: string }> };
    assert.ok(body.roots.length >= 1);
    assert.ok(body.roots.every((root) => root.name && path.isAbsolute(root.path)));
  });
});

test("filesystem directories returns only directory entries", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "orchestrator-routes-"));

  try {
    await fs.mkdir(path.join(tempRoot, "alpha"));
    await fs.mkdir(path.join(tempRoot, "beta"));
    await fs.writeFile(path.join(tempRoot, "note.txt"), "not a directory");

    await withRouterServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/fs/directories?path=${encodeURIComponent(tempRoot)}`, {
        headers: { "x-orchestrator-token": "correct-token" }
      });
      assert.equal(response.status, 200);

      const body = (await response.json()) as {
        path: string;
        parentPath: string | null;
        directories: Array<{ name: string; path: string }>;
      };
      assert.equal(body.path, path.resolve(tempRoot));
      assert.equal(body.parentPath, path.dirname(path.resolve(tempRoot)));
      assert.deepEqual(
        body.directories.map((entry) => entry.name),
        ["alpha", "beta"]
      );
    });
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("filesystem directories returns a clean error for invalid paths", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";
  const missingPath = path.join(os.tmpdir(), `orchestrator-missing-${randomUUID()}`);

  await withRouterServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/fs/directories?path=${encodeURIComponent(missingPath)}`, {
      headers: { "x-orchestrator-token": "correct-token" }
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: string };
    assert.match(body.error, /Folder not found|Unable to access folder/);
  });
});

test("task routes reject missing and wrong tokens", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";
  const task = database.createTask({
    projectPath: os.tmpdir(),
    userTask: `protected task ${randomUUID()}`,
    mode: "full",
    status: "completed"
  });

  await withRouterServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/tasks`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/tasks/${task.id}`)).status, 401);

    const wrongTokenHeaders = { "x-orchestrator-token": "wrong-token" };
    assert.equal((await fetch(`${baseUrl}/api/tasks`, { headers: wrongTokenHeaders })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/tasks/${task.id}`, { headers: wrongTokenHeaders })).status, 401);
  });
});

test("task routes accept the configured token", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";
  const task = database.createTask({
    projectPath: os.tmpdir(),
    userTask: `accepted task ${randomUUID()}`,
    mode: "codex",
    status: "completed"
  });
  database.addDiff({
    taskId: task.id,
    phase: "final",
    diffText: [
      "diff --git a/src/app.ts b/src/app.ts",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      "diff --git a/src/view.tsx b/src/view.tsx"
    ].join("\n")
  });
  database.addAgentRun({
    taskId: task.id,
    agentName: "System",
    phase: "test",
    prompt: "test",
    output: "tests passed",
    exitCode: 0
  });
  const headers = { "x-orchestrator-token": "correct-token" };

  await withRouterServer(async (baseUrl) => {
    const listResponse = await fetch(`${baseUrl}/api/tasks`, { headers });
    assert.equal(listResponse.status, 200);

    const scopedListResponse = await fetch(`${baseUrl}/api/tasks?projectPath=${encodeURIComponent(task.projectPath)}`, { headers });
    assert.equal(scopedListResponse.status, 200);
    const scopedTasks = (await scopedListResponse.json()) as Array<{ id: string }>;
    assert.ok(scopedTasks.some((item) => item.id === task.id));

    const detailResponse = await fetch(`${baseUrl}/api/tasks/${task.id}`, { headers });
    assert.equal(detailResponse.status, 200);
    const detail = (await detailResponse.json()) as { task: { id: string }; changedFiles: string[]; testResult?: { output: string; exitCode: number | null } };
    assert.equal(detail.task.id, task.id);
    assert.deepEqual(detail.changedFiles, ["src/app.ts", "src/view.tsx"]);
    assert.deepEqual(detail.testResult, { output: "tests passed", exitCode: 0 });
  });
});

test("stream orchestration emits terminal transcript events", async () => {
  process.env.ORCHESTRATOR_API_TOKEN = "correct-token";
  const userTask = `stream task ${randomUUID()}`;

  await withFakeClaude(async () => {
    await withRouterServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/orchestrate/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-orchestrator-token": "correct-token"
        },
        body: JSON.stringify({ projectPath: "", userTask, mode: "chat" })
      });

      assert.equal(response.status, 200);
      const events = await readNdjson(response);

      assert.ok(events.some((event) => event.type === "run_start" && event.command === "claude"));
      assert.ok(events.some((event) => event.type === "stdin" && String(event.content).includes(userTask)));
      assert.ok(events.some((event) => event.type === "output" && /claude live stdout|claude live stderr/.test(String(event.content))));
      assert.ok(events.some((event) => event.type === "run_end" && event.exitCode === 0));

      const resultEvent = events.find((event) => event.type === "orchestration_result");
      assert.equal(resultEvent?.result?.status, "completed");
      assert.equal(resultEvent?.result?.agentRuns?.[0]?.agentName, "Claude");
    });
  });
});
