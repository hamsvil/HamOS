import { promises as fs } from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";

export const PROJECT_ROOT = path.resolve(process.cwd(), "..", "..");

function safePath(input: string): string {
  const p = path.resolve(PROJECT_ROOT, input.replace(/^\/+/, ""));
  if (!p.startsWith(PROJECT_ROOT + path.sep) && p !== PROJECT_ROOT) {
    throw new Error(`Path di luar project root ditolak: ${input}`);
  }
  return p;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export const TOOLS: ToolDef[] = [
  {
    name: "read_file",
    description: "Membaca isi file teks dari project. Gunakan path relatif terhadap root project.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relatif file, contoh: artifacts/api-server/src/index.ts" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Menulis (membuat atau menimpa) file teks. Folder induk dibuat otomatis.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relatif file" },
        content: { type: "string", description: "Isi lengkap file (akan menimpa file lama)" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_dir",
    description: "Daftar isi sebuah direktori (file & subfolder).",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "Path relatif direktori, '.' untuk root" } },
      required: ["path"],
    },
  },
  {
    name: "run_shell",
    description: "Menjalankan perintah shell di project root. Timeout 30 detik. Tidak interaktif.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Perintah shell, contoh: 'pnpm install', 'ls -la'" },
      },
      required: ["command"],
    },
  },
  {
    name: "query_db",
    description: "Eksekusi SQL ke PostgreSQL aplikasi (Drizzle). Mendukung SELECT/INSERT/UPDATE/DELETE.",
    parameters: {
      type: "object",
      properties: { sql: { type: "string", description: "Pernyataan SQL valid PostgreSQL" } },
      required: ["sql"],
    },
  },
  {
    name: "restart_workflow",
    description: "Restart sebuah workflow Replit. Nama workflow contoh: 'artifacts/api-server: API Server'.",
    parameters: {
      type: "object",
      properties: { name: { type: "string", description: "Nama workflow" } },
      required: ["name"],
    },
  },
];

export interface ToolResult { ok: boolean; result?: unknown; error?: string }

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    logger.info({ tool: name, args: summarizeArgs(args) }, "agent.tool.exec");
    switch (name) {
      case "read_file": {
        const p = safePath(String(args.path));
        const stat = await fs.stat(p);
        if (stat.size > 256 * 1024) return { ok: false, error: `File terlalu besar (${stat.size} byte; max 256KB)` };
        const content = await fs.readFile(p, "utf8");
        return { ok: true, result: { path: args.path, size: stat.size, content } };
      }
      case "write_file": {
        const p = safePath(String(args.path));
        const content = String(args.content ?? "");
        await fs.mkdir(path.dirname(p), { recursive: true });
        await fs.writeFile(p, content, "utf8");
        return { ok: true, result: { path: args.path, bytesWritten: Buffer.byteLength(content, "utf8") } };
      }
      case "list_dir": {
        const p = safePath(String(args.path ?? "."));
        const entries = await fs.readdir(p, { withFileTypes: true });
        return {
          ok: true,
          result: {
            path: args.path,
            entries: entries.map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : "file" })),
          },
        };
      }
      case "run_shell": {
        const cmd = String(args.command ?? "");
        if (!cmd.trim()) return { ok: false, error: "Perintah kosong" };
        const out = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
          exec(cmd, { cwd: PROJECT_ROOT, timeout: 30_000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
            resolve({
              stdout: String(stdout).slice(0, 8000),
              stderr: String(stderr).slice(0, 4000),
              code: err && (err as NodeJS.ErrnoException).code != null ? Number((err as { code?: number }).code ?? 1) : 0,
            });
          });
        });
        return { ok: out.code === 0, result: out };
      }
      case "query_db": {
        const stmt = String(args.sql ?? "").trim();
        if (!stmt) return { ok: false, error: "SQL kosong" };
        const r = await db.execute(sql.raw(stmt));
        const rows = (r as unknown as { rows?: unknown[] }).rows ?? r;
        const rowsArr = Array.isArray(rows) ? rows : [];
        return { ok: true, result: { rowCount: rowsArr.length, rows: rowsArr.slice(0, 200) } };
      }
      case "restart_workflow": {
        const name = String(args.name ?? "");
        if (!name) return { ok: false, error: "Nama workflow kosong" };
        const out = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
          exec(
            `replit workflow restart ${JSON.stringify(name)}`,
            { cwd: PROJECT_ROOT, timeout: 60_000 },
            (err, stdout, stderr) => resolve({
              stdout: String(stdout),
              stderr: String(stderr),
              code: err ? 1 : 0,
            }),
          );
        });
        return { ok: out.code === 0, result: out };
      }
      default:
        return { ok: false, error: `Tool tidak dikenal: ${name}` };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function summarizeArgs(args: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === "string" && v.length > 120) out[k] = v.slice(0, 120) + `…(+${v.length - 120})`;
    else out[k] = v;
  }
  return out;
}

/** OpenAI function-calling shape. */
export const TOOLS_OPENAI = TOOLS.map((t) => ({
  type: "function" as const,
  function: { name: t.name, description: t.description, parameters: t.parameters },
}));

/** Gemini function-declaration shape. */
export const TOOLS_GEMINI = [{
  functionDeclarations: TOOLS.map((t) => ({
    name: t.name, description: t.description, parameters: t.parameters,
  })),
}];

/** Prompt-based fallback: instruct model to emit JSON tool calls. */
export const FALLBACK_PROMPT = `
Kamu memiliki akses ke tools berikut. Untuk memanggil tool, BALAS HANYA dengan blok JSON di dalam fence \`\`\`tool ... \`\`\` (tanpa teks lain).

Format pemanggilan:
\`\`\`tool
{"name":"<nama_tool>","arguments":{...}}
\`\`\`

Setelah hasil tool dikembalikan oleh sistem (sebagai pesan user yang diawali "TOOL_RESULT:"), kamu boleh memanggil tool lagi atau memberikan jawaban final dalam teks biasa.

Tools tersedia:
${TOOLS.map((t) => `- ${t.name}(${Object.keys(t.parameters.properties).join(", ")}): ${t.description}`).join("\n")}
`.trim();

export function parseFallbackToolCall(text: string): { name: string; arguments: Record<string, unknown> } | null {
  const m = text.match(/```tool\s*([\s\S]*?)```/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1].trim());
    if (obj && typeof obj.name === "string") {
      return { name: obj.name, arguments: (obj.arguments ?? {}) as Record<string, unknown> };
    }
  } catch { /* ignore */ }
  return null;
}
