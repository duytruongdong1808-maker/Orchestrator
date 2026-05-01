import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import express from "express";
import { requireApiToken } from "./routes.js";

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
