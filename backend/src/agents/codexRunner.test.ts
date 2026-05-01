import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runCodex } from "./codexRunner.js";

function pathEnvKey() {
  return Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
}

test("runCodex passes the prompt through stdin instead of argv", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-codex-runner-"));
  const capturePath = path.join(dir, "capture.json");
  const shimPath = path.join(dir, "codex-shim.cjs");
  const unixCommandPath = path.join(dir, "codex");
  const windowsCommandPath = path.join(dir, "codex.cmd");

  fs.writeFileSync(
    shimPath,
    `const fs = require("node:fs");
let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { stdin += chunk; });
process.stdin.on("end", () => {
  fs.writeFileSync(process.env.CODEX_CAPTURE_PATH, JSON.stringify({ args: process.argv.slice(2), stdin }));
  console.log("captured");
});
`
  );
  fs.writeFileSync(unixCommandPath, `#!/bin/sh\nnode "${shimPath.replace(/\\/g, "\\\\")}" "$@"\n`);
  fs.chmodSync(unixCommandPath, 0o755);
  fs.writeFileSync(windowsCommandPath, `@echo off\r\nnode "%~dp0codex-shim.cjs" %*\r\n`);

  const key = pathEnvKey();
  const originalPath = process.env[key];
  const originalCapturePath = process.env.CODEX_CAPTURE_PATH;
  process.env[key] = `${dir}${path.delimiter}${originalPath ?? ""}`;
  process.env.CODEX_CAPTURE_PATH = capturePath;

  try {
    const prompt = "Implement this safely.\n".repeat(5000);
    const result = await runCodex(process.cwd(), prompt);

    assert.equal(result.exitCode, 0);
    const capture = JSON.parse(fs.readFileSync(capturePath, "utf8")) as { args: string[]; stdin: string };
    assert.deepEqual(capture.args, ["exec", "-"]);
    assert.equal(capture.stdin, prompt);
  } finally {
    process.env[key] = originalPath;
    if (originalCapturePath === undefined) {
      delete process.env.CODEX_CAPTURE_PATH;
    } else {
      process.env.CODEX_CAPTURE_PATH = originalCapturePath;
    }
  }
});
