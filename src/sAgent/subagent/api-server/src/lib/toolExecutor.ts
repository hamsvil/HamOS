// @ts-nocheck
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { db } from "@workspace/db";
import { toolsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export const WORKSPACE_ROOT = path.resolve(process.cwd(), "..", "..");

export interface ToolCallResult {
  success: boolean;
  output: string;
  error?: string;
}

function resolvePath(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(WORKSPACE_ROOT, p);
}

export async function executeToolWithDynamic(
  name: string,
  input: Record<string, unknown>
): Promise<ToolCallResult> {
  const builtinResult = executeBuiltinTool(name, input);
  if (builtinResult !== null) return builtinResult;

  try {
    const [dynamicTool] = await db
      .select()
      .from(toolsTable)
      .where(and(eq(toolsTable.name, name), eq(toolsTable.enabled, true)));

    if (!dynamicTool) {
      return { success: false, output: "", error: `Unknown tool: ${name}` };
    }

    const fn = new Function("input", "WORKSPACE_ROOT", "execSync", "fs", "path", dynamicTool.implementation);
    const result = fn(input, WORKSPACE_ROOT, execSync, fs, path);
    return { success: true, output: String(result ?? "(no output)") };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", error: msg };
  }
}

export function executeBuiltinTool(
  name: string,
  input: Record<string, unknown>
): ToolCallResult | null {
  try {
    switch (name) {
      case "read_file":
        return toolReadFile(input);
      case "write_file":
        return toolWriteFile(input);
      case "edit_file":
        return toolEditFile(input);
      case "bash":
        return toolBash(input);
      case "glob":
        return toolGlob(input);
      case "grep_files":
        return toolGrep(input);
      case "list_dir":
        return toolListDir(input);
      case "read_multiple":
        return toolReadMultiple(input);
      default:
        return null;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", error: msg };
  }
}

function toolReadFile(input: Record<string, unknown>): ToolCallResult {
  const filePath = resolvePath(input.path as string);
  if (!fs.existsSync(filePath)) {
    return { success: false, output: "", error: `File not found: ${filePath}` };
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");
  const offset = input.offset ? Number(input.offset) - 1 : 0;
  const limit = input.limit ? Number(input.limit) : lines.length;
  const selected = lines.slice(offset, offset + limit);
  const numbered = selected
    .map((l, i) => `${String(offset + i + 1).padStart(6)}→ ${l}`)
    .join("\n");
  return { success: true, output: numbered };
}

function toolWriteFile(input: Record<string, unknown>): ToolCallResult {
  const filePath = resolvePath(input.path as string);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, input.content as string, "utf-8");
  return { success: true, output: `File written: ${filePath}` };
}

function toolEditFile(input: Record<string, unknown>): ToolCallResult {
  const filePath = resolvePath(input.path as string);
  if (!fs.existsSync(filePath)) {
    return { success: false, output: "", error: `File not found: ${filePath}` };
  }
  let content = fs.readFileSync(filePath, "utf-8");
  const oldStr = input.old_string as string;
  const newStr = input.new_string as string;
  const replaceAll = input.replace_all === "true";

  if (!content.includes(oldStr)) {
    return {
      success: false,
      output: "",
      error: `String not found in file.\nLooking for:\n${oldStr.slice(0, 200)}`,
    };
  }

  content = replaceAll ? content.split(oldStr).join(newStr) : content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, content, "utf-8");
  return { success: true, output: `Edit applied to ${filePath}` };
}

function toolBash(input: Record<string, unknown>): ToolCallResult {
  const command = input.command as string;
  const timeout = Math.min(Number(input.timeout ?? 30000), 120000);
  const cwd = input.cwd ? resolvePath(input.cwd as string) : WORKSPACE_ROOT;

  try {
    const output = execSync(command, {
      cwd,
      timeout,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { success: true, output: output || "(no output)" };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const combined = [e.stdout, e.stderr, e.message].filter(Boolean).join("\n").trim();
    return { success: false, output: combined, error: combined };
  }
}

function toolGlob(input: Record<string, unknown>): ToolCallResult {
  const pattern = input.pattern as string;
  const cwd = input.cwd ? resolvePath(input.cwd as string) : WORKSPACE_ROOT;
  try {
    const result = execSync(
      `find . -path './node_modules' -prune -o -name "${pattern.replace("**/", "").replace("**", "*")}" -print 2>/dev/null | head -200`,
      { cwd, encoding: "utf-8", timeout: 15000 }
    );
    return { success: true, output: result.trim() || "(no matches)" };
  } catch {
    return { success: true, output: "(no matches)" };
  }
}

function toolGrep(input: Record<string, unknown>): ToolCallResult {
  const pattern = input.pattern as string;
  const searchPath = input.path ? resolvePath(input.path as string) : WORKSPACE_ROOT;
  const caseFlag = input.case_insensitive === "true" ? "-i" : "";
  const ctxLines = input.context_lines ? `-C ${Number(input.context_lines)}` : "";
  const globFilter = input.glob ? `--include="${input.glob}"` : "";
  const excludeDirs = "--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=.local";
  const cmd = `grep -rn ${caseFlag} ${ctxLines} ${globFilter} ${excludeDirs} -E "${pattern.replace(/"/g, '\\"')}" "${searchPath}" 2>/dev/null | head -200`;

  try {
    const output = execSync(cmd, { encoding: "utf-8", timeout: 15000, cwd: WORKSPACE_ROOT });
    return { success: true, output: output.trim() || "(no matches)" };
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 1) return { success: true, output: "(no matches)" };
    return { success: false, output: "", error: String(err) };
  }
}

function toolListDir(input: Record<string, unknown>): ToolCallResult {
  const dirPath = input.path ? resolvePath(input.path as string) : WORKSPACE_ROOT;
  const recursive = input.recursive === "true";

  if (!fs.existsSync(dirPath)) {
    return { success: false, output: "", error: `Directory not found: ${dirPath}` };
  }

  if (recursive) {
    try {
      const out = execSync(
        `find "${dirPath}" -not -path "*/node_modules/*" -not -path "*/.git/*" | sort | head -500`,
        { encoding: "utf-8", timeout: 10000 }
      );
      return { success: true, output: out.trim() };
    } catch {
      return { success: false, output: "", error: "Failed to list directory recursively" };
    }
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const lines = entries
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((e) => `${e.isDirectory() ? "DIR" : "FILE"} ${e.name}`);

  return { success: true, output: lines.join("\n") || "(empty directory)" };
}

function toolReadMultiple(input: Record<string, unknown>): ToolCallResult {
  const paths = (input.paths as string).split(",").map((p) => p.trim());
  const results: string[] = [];

  for (const p of paths) {
    const filePath = resolvePath(p);
    if (!fs.existsSync(filePath)) {
      results.push(`=== ${p} ===\n[FILE NOT FOUND]\n`);
      continue;
    }
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const preview = content.length > 10000 ? content.slice(0, 10000) + "\n...(truncated)" : content;
      results.push(`=== ${p} ===\n${preview}\n`);
    } catch (err) {
      results.push(`=== ${p} ===\n[ERROR: ${String(err)}]\n`);
    }
  }

  return { success: true, output: results.join("\n") };
}

export const BUILTIN_TOOL_DEFINITIONS = [
  {
    name: "read_file",
    description: "Read contents of a file in the workspace.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path (absolute or relative to workspace root)" },
        offset: { type: "number", description: "Line number to start reading from (1-indexed)" },
        limit: { type: "number", description: "Maximum number of lines to read" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file, creating or overwriting it.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Make precise string replacement in a file.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path" },
        old_string: { type: "string", description: "Exact text to replace" },
        new_string: { type: "string", description: "Replacement text" },
        replace_all: { type: "string", description: "Set 'true' to replace all occurrences" },
      },
      required: ["path", "old_string", "new_string"],
    },
  },
  {
    name: "bash",
    description: "Execute a bash command in the workspace root.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        timeout: { type: "number", description: "Timeout in milliseconds (max 120000)" },
        cwd: { type: "string", description: "Working directory (defaults to workspace root)" },
      },
      required: ["command"],
    },
  },
  {
    name: "glob",
    description: "Find files matching a glob pattern.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string", description: "Glob pattern (e.g. **/*.ts)" },
        cwd: { type: "string", description: "Directory to search in" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "grep_files",
    description: "Search for a regex pattern in files.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string", description: "Regex pattern to search for" },
        path: { type: "string", description: "Directory or file to search in" },
        glob: { type: "string", description: "File glob filter (e.g. *.ts)" },
        case_insensitive: { type: "string", description: "Set 'true' for case-insensitive search" },
        context_lines: { type: "number", description: "Lines of context around matches" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "list_dir",
    description: "List contents of a directory.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Directory path" },
        recursive: { type: "string", description: "Set 'true' for recursive listing" },
      },
      required: [],
    },
  },
  {
    name: "read_multiple",
    description: "Read multiple files at once.",
    input_schema: {
      type: "object" as const,
      properties: {
        paths: { type: "string", description: "Comma-separated list of file paths" },
      },
      required: ["paths"],
    },
  },
];
