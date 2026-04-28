import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const intervalMs = 5000;
let isSyncing = false;

function run(cmd: string): string {
  return execSync(cmd, {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  })
    .toString()
    .trim();
}

function hasChanges(): boolean {
  const status = run("git status --porcelain");
  return status.length > 0;
}

function syncChanges(): void {
  if (isSyncing) return;
  isSyncing = true;

  try {
    if (!hasChanges()) {
      return;
    }

    console.log("[auto-push] Changes detected. Staging files...");
    run("git add -A");
    const message = `auto: sync changes ${new Date().toISOString()}`;
    run(`git commit -m "${message}"`);
    console.log("[auto-push] Commit created. Pushing to origin/main...");
    run("git push origin main");
    console.log("[auto-push] Push complete.");
  } catch (error) {
    if (error instanceof Error) {
      console.error("[auto-push] Error:", error.message);
    } else {
      console.error("[auto-push] Unknown error", error);
    }
  } finally {
    isSyncing = false;
  }
}

console.log(`[auto-push] Watching repository at ${repoRoot}`);
console.log("[auto-push] Checking for changes every 5 seconds...");
setInterval(syncChanges, intervalMs);
