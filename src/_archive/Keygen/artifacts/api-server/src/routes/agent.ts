import { Router } from "express";
import fetch from "node-fetch";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../lib/auth.js";
import { getBuiltinProvider, isSsrfBlocked } from "../lib/providers.js";
import {
  TOOLS, TOOLS_OPENAI, TOOLS_GEMINI, FALLBACK_PROMPT,
  executeTool, parseFallbackToolCall,
} from "../lib/agent-tools.js";
import { logger } from "../lib/logger.js";

const router = Router();
router.use(requireAuth);
router.use((req: Request, res: Response, next: NextFunction) => {
  if (req.session.role !== "admin") return res.status(403).json({ error: "Hanya admin yang boleh memakai agent." });
  next();
});

const MAX_ITERATIONS = 12;

interface AgentMsg { role: "system" | "user" | "assistant"; content: string }
interface AgentEvent {
  type: "assistant" | "tool_call" | "tool_result" | "final" | "error" | "info";
  text?: string;
  tool?: string;
  args?: unknown;
  result?: unknown;
  error?: string;
  iteration?: number;
}

router.get("/tools", (_req, res) => {
  res.json({ tools: TOOLS });
});

router.post("/chat", async (req, res) => {
  const {
    provider, model, key, messages, systemPrompt, temperature, maxTokens, mode,
  } = req.body as {
    provider?: string; model?: string; key?: string;
    messages?: AgentMsg[]; systemPrompt?: string;
    temperature?: number; maxTokens?: number;
    mode?: "native" | "fallback";
  };

  if (!provider || !model || !key || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "provider, model, key, messages wajib diisi" });
  }
  const p = getBuiltinProvider(provider);
  if (!p) return res.status(404).json({ error: "Provider tidak dikenal" });
  if (p.chatFormat === "none" || !p.chatUrl) return res.status(400).json({ error: "Provider belum mendukung chat" });

  const events: AgentEvent[] = [];
  const useFallback = mode === "fallback";
  const baseSystem = (systemPrompt?.trim() ? systemPrompt.trim() + "\n\n" : "")
    + "Kamu adalah agent yang bekerja di dalam project Replit milik user. Kamu boleh memanggil tools untuk membaca/menulis file, menjalankan shell, query database, dan restart workflow. Pakai tools secara hati-hati dan jelaskan langkahmu.";

  // Working transcript (without our agent system prompt for return value).
  const transcript: AgentMsg[] = [
    { role: "system", content: useFallback ? `${baseSystem}\n\n${FALLBACK_PROMPT}` : baseSystem },
    ...messages.filter((m) => m.role !== "system"),
  ];

  try {
    if (p.chatFormat === "gemini") {
      await runGeminiLoop(p.chatUrl, model, key, transcript, events, { temperature, maxTokens, useFallback });
    } else {
      await runOpenAiLoop(p.chatUrl, model, key, p, transcript, events, { temperature, maxTokens, useFallback });
    }
    return res.json({ events, finalMessages: transcript.filter((m) => m.role !== "system") });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "agent.chat.fail");
    events.push({ type: "error", error: msg });
    return res.status(502).json({ events, error: msg });
  }
});

interface LoopOpts { temperature?: number; maxTokens?: number; useFallback: boolean }

async function runOpenAiLoop(
  url: string, model: string, key: string,
  p: ReturnType<typeof getBuiltinProvider>,
  transcript: AgentMsg[], events: AgentEvent[], opts: LoopOpts,
) {
  if (!p) throw new Error("Provider hilang");
  if (isSsrfBlocked(url)) throw new Error("URL diblokir");

  const headers: Record<string, string> = {
    "Content-Type": "application/json", "User-Agent": "HamKeyGen-Agent/1.0", "Accept": "application/json",
  };
  if (p.validateHeader.toLowerCase().startsWith("authorization:")) {
    const scheme = p.validateHeader.slice(p.validateHeader.indexOf(":") + 1).trim();
    headers["Authorization"] = scheme ? `${scheme} ${key}` : key;
  } else {
    headers["Authorization"] = `Bearer ${key}`;
  }
  if (p.slug === "openrouter") headers["HTTP-Referer"] = "https://hamkeygen.local";

  // Use OpenAI-style tool_calls representation in our internal transcript while talking to the model,
  // but our transcript variable only carries plain role/content strings. We'll keep a parallel rich array.
  type RichMsg =
    | { role: "system" | "user"; content: string }
    | { role: "assistant"; content: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }
    | { role: "tool"; tool_call_id: string; content: string };

  const rich: RichMsg[] = transcript.map((m) => ({ role: m.role, content: m.content } as RichMsg));

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const body: Record<string, unknown> = {
      model,
      messages: rich,
      ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
      ...(typeof opts.maxTokens === "number" ? { max_tokens: opts.maxTokens } : {}),
    };
    if (!opts.useFallback) {
      body.tools = TOOLS_OPENAI;
      body.tool_choice = "auto";
    }

    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await r.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    if (!r.ok) {
      const err = (json as { error?: { message?: string } | string } | null);
      const msg = (typeof err?.error === "string" ? err.error : err?.error?.message) ?? text.slice(0, 400) ?? `HTTP ${r.status}`;
      throw new Error(msg);
    }
    const choice = (json as { choices?: Array<{ message: { content: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> } }> })?.choices?.[0];
    const message = choice?.message;
    if (!message) throw new Error("Provider tidak mengembalikan choices");

    // Native tool calls path
    if (!opts.useFallback && message.tool_calls && message.tool_calls.length > 0) {
      if (message.content) events.push({ type: "assistant", text: message.content, iteration: iter });
      rich.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });
      for (const tc of message.tool_calls) {
        let parsedArgs: Record<string, unknown> = {};
        try { parsedArgs = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
        events.push({ type: "tool_call", tool: tc.function.name, args: parsedArgs, iteration: iter });
        const result = await executeTool(tc.function.name, parsedArgs);
        events.push({ type: "tool_result", tool: tc.function.name, result: result.ok ? result.result : { error: result.error }, iteration: iter });
        rich.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result.ok ? result.result : { error: result.error }).slice(0, 12_000),
        });
      }
      continue;
    }

    const replyText = message.content ?? "";

    // Fallback path: detect ```tool ...```
    if (opts.useFallback) {
      const call = parseFallbackToolCall(replyText);
      if (call) {
        events.push({ type: "assistant", text: replyText, iteration: iter });
        rich.push({ role: "assistant", content: replyText });
        events.push({ type: "tool_call", tool: call.name, args: call.arguments, iteration: iter });
        const result = await executeTool(call.name, call.arguments);
        events.push({ type: "tool_result", tool: call.name, result: result.ok ? result.result : { error: result.error }, iteration: iter });
        rich.push({
          role: "user",
          content: `TOOL_RESULT: ${JSON.stringify(result.ok ? result.result : { error: result.error }).slice(0, 12_000)}`,
        });
        continue;
      }
    }

    events.push({ type: "final", text: replyText, iteration: iter });
    transcript.push({ role: "assistant", content: replyText });
    return;
  }
  events.push({ type: "error", error: `Iterasi melebihi batas (${MAX_ITERATIONS})` });
}

async function runGeminiLoop(
  baseUrl: string, model: string, key: string,
  transcript: AgentMsg[], events: AgentEvent[], opts: LoopOpts,
) {
  const url = baseUrl.replace("__MODEL__", encodeURIComponent(model)).replace("__KEY__", encodeURIComponent(key));
  if (isSsrfBlocked(url)) throw new Error("URL diblokir");

  const sys = transcript.find((m) => m.role === "system")?.content ?? "";
  type GeminiPart =
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: Record<string, unknown> } };
  type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

  const contents: GeminiContent[] = transcript
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const body: Record<string, unknown> = {
      contents,
      systemInstruction: { parts: [{ text: sys }] },
    };
    if (!opts.useFallback) body.tools = TOOLS_GEMINI;
    if (typeof opts.temperature === "number" || typeof opts.maxTokens === "number") {
      body.generationConfig = {
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
        ...(typeof opts.maxTokens === "number" ? { maxOutputTokens: opts.maxTokens } : {}),
      };
    }

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "HamKeyGen-Agent/1.0" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    if (!r.ok) {
      const msg = (json as { error?: { message?: string } } | null)?.error?.message ?? text.slice(0, 400) ?? `HTTP ${r.status}`;
      throw new Error(msg);
    }
    const cand = (json as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> })?.candidates?.[0];
    const parts: GeminiPart[] = cand?.content?.parts ?? [];

    const fnCalls = parts.filter((p): p is Extract<GeminiPart, { functionCall: unknown }> => "functionCall" in p);
    const texts = parts.filter((p): p is Extract<GeminiPart, { text: string }> => "text" in p).map((p) => p.text).join("\n");

    if (!opts.useFallback && fnCalls.length > 0) {
      if (texts) events.push({ type: "assistant", text: texts, iteration: iter });
      contents.push({ role: "model", parts: parts });
      const responseParts: GeminiPart[] = [];
      for (const fc of fnCalls) {
        events.push({ type: "tool_call", tool: fc.functionCall.name, args: fc.functionCall.args, iteration: iter });
        const result = await executeTool(fc.functionCall.name, fc.functionCall.args ?? {});
        events.push({ type: "tool_result", tool: fc.functionCall.name, result: result.ok ? result.result : { error: result.error }, iteration: iter });
        responseParts.push({
          functionResponse: {
            name: fc.functionCall.name,
            response: result.ok ? { result: result.result } : { error: result.error },
          },
        });
      }
      contents.push({ role: "user", parts: responseParts });
      continue;
    }

    if (opts.useFallback) {
      const call = parseFallbackToolCall(texts);
      if (call) {
        events.push({ type: "assistant", text: texts, iteration: iter });
        contents.push({ role: "model", parts: [{ text: texts }] });
        events.push({ type: "tool_call", tool: call.name, args: call.arguments, iteration: iter });
        const result = await executeTool(call.name, call.arguments);
        events.push({ type: "tool_result", tool: call.name, result: result.ok ? result.result : { error: result.error }, iteration: iter });
        contents.push({
          role: "user",
          parts: [{ text: `TOOL_RESULT: ${JSON.stringify(result.ok ? result.result : { error: result.error }).slice(0, 12_000)}` }],
        });
        continue;
      }
    }

    events.push({ type: "final", text: texts, iteration: iter });
    transcript.push({ role: "assistant", content: texts });
    return;
  }
  events.push({ type: "error", error: `Iterasi melebihi batas (${MAX_ITERATIONS})` });
}

export default router;
