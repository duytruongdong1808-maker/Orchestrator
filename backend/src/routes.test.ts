import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import express from "express";
import { requireApiToken, router } from "./routes.js";

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
