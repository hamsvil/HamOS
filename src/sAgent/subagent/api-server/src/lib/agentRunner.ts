import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { tasksTable, logsTable, toolsTable, memoryTable } from "@workspace/db/schema";
import { eq, gt, and } from "drizzle-orm";
import { taskEventBus } from "./taskEvents.js";
import { executeToolWithDynamic, BUILTIN_TOOL_DEFINITIONS, WORKSPACE_ROOT } from "./toolExecutor.js";
import crypto from "crypto";

const MODEL = "gemini-3.1-pro-preview";
const MAX_TOKENS = 8192;
const MAX_TOOL_ITERATIONS = 50;

const SYSTEM_PROMPT = `You are an autonomous AI autopilot agent with full workspace access.

Your root working directory is: ${WORKSPACE_ROOT}

You operate autonomously — execute tasks fully without asking for confirmation. Use all available tools freely to accomplish objectives. Never leave tasks half-done.

MEMORY SYSTEM:
You have access to a persistent long-term memory store. Facts, decisions, and context are stored there for 24 hours. Before starting a task, check memory for relevant context using list_memory or recall_memory.

TOOLS AVAILABLE:
• read_file       — Read any file in the workspace
• write_file      — Create or overwrite files
• edit_file       — Make precise string replacements
• bash            — Execute shell commands (npm, pnpm, git, etc.)
• glob            — Find files by pattern
• grep_files      — Search file contents by regex
• list_dir        — List directory contents
• read_multiple   — Read multiple files at once
• store_memory    — Store a key-value pair in long-term memory (24h TTL)
• recall_memory   — Retrieve memory entries by key
• list_memory     — List all active memory entries

BEHAVIOR:
- Work autonomously. Make decisions and execute them.
- When stuck, try alternative approaches before giving up.
- Track all files you create or modify.
- Report progress clearly in your text responses.
- At the end, provide: SUMMARY, FILES_CHANGED, RESULT (SUCCESS/FAILED)`;

const cancelTokens: Map<string, boolean> = new Map();
export const runningTasks: Set<string> = new Set();

const MEMORY_TOOLS = [
  {
    name: "store_memory",
    description: "Store a value in persistent long-term memory (24 hour TTL).",
    input_schema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Unique memory key" },
        value: { type: "string", description: "Value to store" },
        category: { type: "string", description: "Category for organization (default: general)" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "recall_memory",
    description: "Retrieve a memory entry by key.",
    input_schema: {
      type: "object" as const,
      properties: { key: { type: "string", description: "Memory key to retrieve" } },
      required: ["key"],
    },
  },
  {
    name: "list_memory",
    description: "List all active memory entries, optionally filtered by category.",
    input_schema: {
      type: "object" as const,
      properties: { category: { type: "string", description: "Filter by category (optional)" } },
      required: [],
    },
  },
];

async function executeMemoryTool(
  name: string,
  input: Record<string, unknown>
): Promise<{ output: string; success: boolean; error?: string } | null> {
  const now = new Date();

  if (name === "store_memory") {
    const key = input.key as string;
    const value = input.value as string;
    const category = (input.category as string) ?? "general";
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await db
      .insert(memoryTable)
      .values({ key, value, category, expiresAt })
      .onConflictDoUpdate({
        target: memoryTable.key,
        set: { value, category, updatedAt: now, expiresAt },
      });
    return { success: true, output: `Memory stored: ${key}` };
  }

  if (name === "recall_memory") {
    const key = input.key as string;
    const [entry] = await db
      .select()
      .from(memoryTable)
      .where(and(eq(memoryTable.key, key), gt(memoryTable.expiresAt, now)));
    if (!entry) return { success: false, output: `Memory key not found or expired: ${key}` };
    return { success: true, output: `${entry.key}: ${entry.value}` };
  }

  if (name === "list_memory") {
    const entries = await db.select().from(memoryTable).where(gt(memoryTable.expiresAt, now));
    if (entries.length === 0) return { success: true, output: "(no memory entries)" };
    return { success: true, output: entries.map((e) => `[${e.category}] ${e.key}: ${e.value}`).join("\n") };
  }

  return null;
}

async function addLog(taskId: string, level: string, message: string, agentCodename?: string): Promise<void> {
  await db.insert(logsTable).values({ taskId, level, message, agentCodename });
  taskEventBus.emitLog({ taskId, level, message, agentCodename, timestamp: new Date().toISOString() });
}

export async function startTask(taskId: string): Promise<void> {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) throw new Error(`Task not found: ${taskId}`);

  await db.update(tasksTable).set({ status: "running", updatedAt: new Date() }).where(eq(tasksTable.id, taskId));
  cancelTokens.set(taskId, false);
  runningTasks.add(taskId);
  await addLog(taskId, "info", `Task started: ${task.title}`);

  const startTime = Date.now();
  const filesChanged: string[] = [];

  try {
    const dynamicTools = await db.select().from(toolsTable).where(eq(toolsTable.enabled, true));

    const allTools = [
      ...BUILTIN_TOOL_DEFINITIONS,
      ...MEMORY_TOOLS,
      ...dynamicTools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as { type: "object"; properties: Record<string, unknown>; required: string[] },
      })),
    ];

    const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
      { role: "user", content: `TASK ID: ${taskId}\nTASK: ${task.title}\n\n${task.description}` },
    ];

    let finalResult: string | null = null;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      if (cancelTokens.get(taskId)) {
        await addLog(taskId, "warn", "Task cancelled by user");
        break;
      }

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: allTools,
        messages: messages as any,
      });

      const textBlocks: string[] = [];
      for (const block of response.content) {
        if (block.type === "text" && block.text.trim()) {
          textBlocks.push(block.text.trim());
          await addLog(taskId, "info", block.text.trim());
        }
      }

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn") {
        if (textBlocks.length > 0) finalResult = textBlocks.join("\n\n");
        break;
      }

      if (response.stop_reason === "tool_use") {
        const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];

        for (const block of response.content) {
          if (block.type !== "tool_use") continue;

          const toolInput = block.input as Record<string, unknown>;
          await addLog(taskId, "debug", `→ ${block.name}(${JSON.stringify(toolInput).slice(0, 120)}...)`);

          const memResult = await executeMemoryTool(block.name, toolInput);
          const result = memResult ?? await executeToolWithDynamic(block.name, toolInput);
          const resultText = result.success ? result.output : `ERROR: ${result.error ?? ""}\n${result.output}`;

          if (block.name === "write_file" || block.name === "edit_file") {
            const filePath = (toolInput.path as string) ?? "";
            if (filePath && !filesChanged.includes(filePath)) filesChanged.push(filePath);
          }

          await addLog(taskId, result.success ? "debug" : "error", `← ${block.name}: ${resultText.slice(0, 300)}`);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText.slice(0, 8000) });
        }

        messages.push({ role: "user", content: toolResults });
      }
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = cancelTokens.get(taskId) ? "cancelled" : "completed";
    await db
      .update(tasksTable)
      .set({ status: finalStatus, result: finalResult, filesChanged, durationMs, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));
    await addLog(taskId, "info", `Task ${finalStatus} in ${(durationMs / 1000).toFixed(1)}s`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startTime;
    await db
      .update(tasksTable)
      .set({ status: "failed", error, durationMs, updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));
    await addLog(taskId, "error", `Task failed: ${error}`);
  } finally {
    runningTasks.delete(taskId);
    cancelTokens.delete(taskId);
  }
}

export function cancelTask(taskId: string): boolean {
  if (!runningTasks.has(taskId)) return false;
  cancelTokens.set(taskId, true);
  return true;
}

export async function createTask(title: string, description: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(tasksTable).values({ id, title, description, status: "pending" });
  return id;
}

export function getRunningTaskCount(): number {
  return runningTasks.size;
}

export async function getSystemInfo() {
  return {
    workspaceRoot: WORKSPACE_ROOT,
    model: MODEL,
    maxTokens: MAX_TOKENS,
    maxToolIterations: MAX_TOOL_ITERATIONS,
    runningTasks: runningTasks.size,
    nodeVersion: process.version,
    uptime: process.uptime(),
  };
}
