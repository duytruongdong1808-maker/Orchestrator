import fs from "node:fs";
import path from "node:path";

const SAFE_SCRIPT_NAMES = new Set(["build", "test", "typecheck", "lint"]);

type PackageJson = {
  packageManager?: string;
  scripts?: Record<string, string>;
};

export type SafePackageScript = {
  command: string;
  args: string[];
  scriptName: string;
};

function readPackageJson(cwd: string): PackageJson {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("Test command requires a package.json in the selected project.");
  }

  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as PackageJson;
}

function detectPackageManager(cwd: string, packageJson: PackageJson) {
  if (packageJson.packageManager?.startsWith("pnpm@") || fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (packageJson.packageManager?.startsWith("yarn@") || fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

function scriptNameFromInput(command: string) {
  const value = command.trim();
  const aliases = [
    /^(build|test|typecheck|lint)$/i,
    /^(?:npm|pnpm|yarn)\s+(?:run\s+)?(build|test|typecheck|lint)$/i
  ];

  for (const alias of aliases) {
    const match = alias.exec(value);
    if (match) return match[1].toLowerCase();
  }

  throw new Error("Only package scripts named build, test, typecheck, or lint may be selected.");
}

export function resolveSafePackageScript(cwd: string, command?: string | null): SafePackageScript | undefined {
  if (!command?.trim()) return undefined;

  const scriptName = scriptNameFromInput(command);
  if (!SAFE_SCRIPT_NAMES.has(scriptName)) {
    throw new Error("Only build, test, typecheck, and lint package scripts are allowed.");
  }

  const packageJson = readPackageJson(cwd);
  if (!packageJson.scripts?.[scriptName]) {
    const available = Object.keys(packageJson.scripts ?? {}).filter((name) => SAFE_SCRIPT_NAMES.has(name));
    const suffix = available.length ? ` Available safe scripts: ${available.join(", ")}.` : " No safe scripts are defined.";
    throw new Error(`Package script "${scriptName}" does not exist.${suffix}`);
  }

  return {
    command: detectPackageManager(cwd, packageJson),
    args: ["run", scriptName],
    scriptName
  };
}
