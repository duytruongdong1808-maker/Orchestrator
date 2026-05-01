# Code Orchestrator

A local AI code orchestration tool that coordinates Claude Code CLI and Codex CLI.

## Requirements

- Node.js
- pnpm
- Git
- Codex CLI installed and logged in
- Claude Code CLI installed and logged in

## Install

```bash
pnpm install
```

## Run

```bash
set ORCHESTRATOR_API_TOKEN=choose-a-local-token
pnpm dev
```

Open:

[http://localhost:5173](http://localhost:5173)

Backend:

[http://localhost:4000](http://localhost:4000)

## Usage

1. Enter project path
2. Enter the same local API token shown in your environment
3. Check CLI
4. Select mode
5. Enter task
6. Enter an optional package script name such as `test`, `build`, `typecheck`, or `lint`
7. Run orchestration
8. Review diff

## Safety Notes

Code Orchestrator requires a clean git working tree before AI orchestration starts.

The app blocks obviously destructive test commands and avoids sending sensitive file names such as `.env`, private keys, and service account files in AI review prompts.

Protected routes require `ORCHESTRATOR_API_TOKEN`. Review mode reviews the current dirty-tree diff without requiring a clean working tree and without running package scripts.
