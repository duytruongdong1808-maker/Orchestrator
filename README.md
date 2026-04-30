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
pnpm dev
```

Open:

[http://localhost:5173](http://localhost:5173)

Backend:

[http://localhost:4000](http://localhost:4000)

## Usage

1. Enter project path
2. Check CLI
3. Select mode
4. Enter task
5. Enter optional test command
6. Run orchestration
7. Review diff
8. Approve or rollback

## Safety Notes

Code Orchestrator requires a clean git working tree before AI orchestration starts. Rollback uses git checkout and clean commands, so it can delete untracked files created during a task.

The app blocks obviously destructive test commands and avoids sending sensitive file names such as `.env`, private keys, and service account files in AI review prompts.
