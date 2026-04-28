/* eslint-disable no-useless-assignment */
/* eslint-disable no-control-regex */
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { ServerResilience } from '../resilience';

const router = express.Router();

/**
 * HAM ENGINE PROXY - The Cloud Fortress
 * Part of THE HAM-NODE SINGULARITY Architecture
 * Pillar 4: API Key Vault & Validation Shield
 *
 * FIX #1: Tambah endpoint /gemini/stream dengan SSE (Server-Sent Events)
 * FIX #2: Rotasi multi-key dari array env vars GEMINI_API_KEY_1..N + GEMINI_API_KEY
 */

// ── Server-side key pool ───────────────────────────────────────────────────────
let serverKeyIndex = 0;
const serverKeyExhausted: Map<string, number> = new Map();
const SERVER_KEY_COOLDOWN_MS = 60_000;

function buildServerKeyPool(): string[] {
  const pool: string[] = [];
  const sanitize = (k: string | undefined) =>
    k?.trim().replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '') || '';

  // Primary key
  const primary = sanitize(process.env.GEMINI_API_KEY);
  if (primary) pool.push(primary);

  // Numbered keys: GEMINI_API_KEY_1 … GEMINI_API_KEY_20
  for (let i = 1; i <= 20; i++) {
    const k = sanitize(process.env[`GEMINI_API_KEY_${i}`]);
    if (k && !pool.includes(k)) pool.push(k);
  }

  return pool;
}

function isServerKeyExhausted(key: string): boolean {
  const t = serverKeyExhausted.get(key);
  if (!t) return false;
  if (Date.now() - t > SERVER_KEY_COOLDOWN_MS) {
    serverKeyExhausted.delete(key);
    return false;
  }
  return true;
}

function markServerKeyExhausted(key: string): void {
  serverKeyExhausted.set(key, Date.now());
}

function getNextServerKey(): string {
  const pool = buildServerKeyPool();
  if (pool.length === 0) throw new Error('No GEMINI_API_KEY configured on server');

  const start = serverKeyIndex;
  let attempts = 0;
  while (attempts < pool.length) {
    const key = pool[serverKeyIndex % pool.length];
    serverKeyIndex = (serverKeyIndex + 1) % pool.length;
    if (!isServerKeyExhausted(key)) return key;
    attempts++;
  }

  // All exhausted — return oldest and reset its cooldown so it gets one more chance
  serverKeyExhausted.clear();
  serverKeyIndex = start;
  return pool[start % pool.length];
}

// ── Non-streaming endpoint (legacy / fallback) ────────────────────────────────
router.post('/gemini/generate', async (req, res) => {
  try {
    const { contents, config, model = 'gemini-2.5-flash' } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Contents are required' });
    }

    const promptText =
      typeof contents === 'string' ? contents : JSON.stringify(contents);
    if (promptText.includes('<script>') || promptText.includes('javascript:')) {
      console.warn('[Cloud Fortress] Potentially malicious pattern in prompt');
    }

    let lastError: any;
    const pool = buildServerKeyPool();
    if (pool.length === 0) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    for (let attempt = 0; attempt < Math.min(pool.length, 3); attempt++) {
      const apiKey = getNextServerKey();
      try {
        const genAI = new GoogleGenAI({ apiKey });
        const result = await ServerResilience.execute(
          'GeminiGenerateContent',
          () =>
            genAI.models.generateContent({
              model,
              contents,
              config: config,
            }),
        );

        // Return serializable plain object
        const text = result.text ?? '';
        const candidates = result.candidates?.map((c: any) => ({
          content: c.content,
          finishReason: c.finishReason,
          groundingMetadata: c.groundingMetadata,
        })) ?? [];

        return res.json({ text, candidates });
      } catch (err: any) {
        lastError = err;
        const status = err.status || err.statusCode;
        if (status === 429 || status === 403 || status === 401) {
          markServerKeyExhausted(apiKey);
          console.warn(`[Cloud Fortress] Key rate-limited (${status}). Rotating…`);
          continue;
        }
        break;
      }
    }

    throw lastError || new Error('All server keys failed');
  } catch (error: any) {
    console.error('[Cloud Fortress] Ham Engine Proxy Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// ── Streaming endpoint (SSE) ──────────────────────────────────────────────────
router.post('/gemini/stream', async (req, res) => {
  const { contents, config, model = 'gemini-2.5-flash' } = req.body;

  if (!contents) {
    return res.status(400).json({ error: 'Contents are required' });
  }

  const pool = buildServerKeyPool();
  if (pool.length === 0) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
  }

  // Set SSE headers before any streaming begins
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data: object) => {
    if (res.writableEnded || res.headersSent) return;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let lastError: any;

  for (let attempt = 0; attempt < Math.min(pool.length, 3); attempt++) {
    const apiKey = getNextServerKey();
    try {
      const genAI = new GoogleGenAI({ apiKey });
      const result = await genAI.models.generateContentStream({
        model,
        contents,
        config: config,
      });

      for await (const chunk of result) {
        const text = chunk.text ?? '';
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata ?? null;
        if (text) {
          sendEvent({ type: 'chunk', text, groundingMetadata });
        }
      }

      if (!res.writableEnded) {
        sendEvent({ type: 'done' });
        res.end();
      }
      return;
    } catch (err: any) {
      lastError = err;
      const status = err.status || err.statusCode;
      if (status === 429 || status === 403 || status === 401) {
        markServerKeyExhausted(apiKey);
        console.warn(`[Cloud Fortress] Stream key rate-limited (${status}). Rotating…`);
        sendEvent({ type: 'key_rotated' });
        continue;
      }
      break;
    }
  }

  if (!res.writableEnded) {
    sendEvent({ type: 'error', message: lastError?.message || 'Streaming failed after key rotation' });
    res.end();
  }
});

export default router;
