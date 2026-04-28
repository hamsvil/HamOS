import { Router } from "express";
import fetch from "node-fetch";
import { requireAuth } from "../lib/auth.js";
import { getBuiltinProvider, isSsrfBlocked, BUILTIN_PROVIDERS } from "../lib/providers.js";

const router = Router();
router.use(requireAuth);

interface ChatMessage { role: "user" | "assistant" | "system"; content: string }

/** Provider catalog for the chat UI. */
router.get("/providers", (_req, res) => {
  res.json(
    BUILTIN_PROVIDERS
      .filter((p) => p.chatFormat === "openai" || p.chatFormat === "gemini")
      .map((p) => ({
        slug: p.slug, name: p.name, chatFormat: p.chatFormat,
        prefixPattern: p.prefixPattern, hasModelsList: Boolean(p.modelsUrl),
        encryption: p.encryption, docsUrl: p.docsUrl,
      })),
  );
});

/** List models from the provider using the user-supplied key. */
router.post("/models", async (req, res) => {
  const { provider, key } = req.body as { provider?: string; key?: string };
  if (!provider || !key) return res.status(400).json({ error: "provider dan key wajib diisi" });
  const p = getBuiltinProvider(provider);
  if (!p) return res.status(404).json({ error: "Provider tidak dikenal" });
  if (!p.modelsUrl) return res.json({ models: [] });

  const url = p.modelsUrl.includes("__KEY__")
    ? p.modelsUrl.replace("__KEY__", encodeURIComponent(key))
    : p.modelsUrl;
  if (isSsrfBlocked(url)) return res.status(400).json({ error: "URL diblokir" });

  const headers: Record<string, string> = { "User-Agent": "HamKeyGen/1.0", "Accept": "application/json" };
  if (!p.modelsUrl.includes("__KEY__")) {
    if (p.validateHeader.toLowerCase().startsWith("authorization:")) {
      const scheme = p.validateHeader.slice(p.validateHeader.indexOf(":") + 1).trim();
      headers["Authorization"] = scheme ? `${scheme} ${key}` : key;
    } else if (p.validateHeader.toLowerCase() === "authorization") {
      headers["Authorization"] = `Bearer ${key}`;
    } else {
      headers[p.validateHeader] = key;
    }
  }

  try {
    const r = await fetch(url, { method: "GET", headers });
    const text = await r.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    if (!r.ok) return res.status(r.status).json({ error: json?.error?.message ?? json?.message ?? text?.slice(0, 240) ?? `HTTP ${r.status}` });

    let models: Array<{ id: string }> = [];
    if (Array.isArray(json?.data)) models = json.data.map((m: any) => ({ id: String(m.id ?? m.name ?? "") })).filter((m: any) => m.id);
    else if (Array.isArray(json?.models)) models = json.models.map((m: any) => ({ id: String((m.name ?? m.id ?? "").replace(/^models\//, "")) })).filter((m: any) => m.id);
    res.json({ models });
  } catch (e: any) {
    res.status(502).json({ error: e?.message ?? "Gagal menghubungi provider" });
  }
});

/** Single-shot chat completion against the provider with the user-supplied key. */
router.post("/", async (req, res) => {
  const { provider, model, key, messages, temperature, maxTokens } = req.body as {
    provider?: string; model?: string; key?: string;
    messages?: ChatMessage[]; temperature?: number; maxTokens?: number;
  };
  if (!provider || !model || !key || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "provider, model, key, messages wajib diisi" });
  }
  const p = getBuiltinProvider(provider);
  if (!p) return res.status(404).json({ error: "Provider tidak dikenal" });
  if (p.chatFormat === "none" || !p.chatUrl) return res.status(400).json({ error: "Provider belum mendukung chat" });

  const startedAt = Date.now();

  try {
    if (p.chatFormat === "gemini") {
      const url = p.chatUrl.replace("__MODEL__", encodeURIComponent(model)).replace("__KEY__", encodeURIComponent(key));
      if (isSsrfBlocked(url)) return res.status(400).json({ error: "URL diblokir" });

      const sys = messages.find((m) => m.role === "system")?.content;
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

      const body: any = { contents };
      if (sys) body.systemInstruction = { parts: [{ text: sys }] };
      if (typeof temperature === "number" || typeof maxTokens === "number") {
        body.generationConfig = {
          ...(typeof temperature === "number" ? { temperature } : {}),
          ...(typeof maxTokens === "number" ? { maxOutputTokens: maxTokens } : {}),
        };
      }

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "HamKeyGen/1.0" },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
      if (!r.ok) return res.status(r.status).json({ error: json?.error?.message ?? text?.slice(0, 400) ?? `HTTP ${r.status}` });
      const reply = json?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).filter(Boolean).join("\n") ?? "";
      res.json({
        reply,
        provider, model,
        responseTime: Date.now() - startedAt,
        usage: json?.usageMetadata ?? null,
      });
      return;
    }

    // OpenAI-compatible
    if (isSsrfBlocked(p.chatUrl)) return res.status(400).json({ error: "URL diblokir" });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "HamKeyGen/1.0",
      "Accept": "application/json",
    };
    if (p.validateHeader.toLowerCase().startsWith("authorization:")) {
      const scheme = p.validateHeader.slice(p.validateHeader.indexOf(":") + 1).trim();
      headers["Authorization"] = scheme ? `${scheme} ${key}` : key;
    } else {
      headers["Authorization"] = `Bearer ${key}`;
    }
    if (p.slug === "openrouter") headers["HTTP-Referer"] = "https://hamkeygen.local";

    const body = {
      model,
      messages,
      ...(typeof temperature === "number" ? { temperature } : {}),
      ...(typeof maxTokens === "number" ? { max_tokens: maxTokens } : {}),
    };
    const r = await fetch(p.chatUrl, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await r.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    if (!r.ok) return res.status(r.status).json({ error: json?.error?.message ?? json?.error ?? text?.slice(0, 400) ?? `HTTP ${r.status}` });
    const reply = json?.choices?.[0]?.message?.content ?? "";
    res.json({
      reply,
      provider, model,
      responseTime: Date.now() - startedAt,
      usage: json?.usage ?? null,
    });
  } catch (e: any) {
    res.status(502).json({ error: e?.message ?? "Gagal menghubungi provider" });
  }
});

export default router;
