import { Router } from 'express';

/**
 * AeternaGlass Relay Router
 * Mirrors the standalone server/relay/index.js from the AeternaGlass Android
 * project, mounted into Ham AiStudio's Express server so the Android floating
 * AI agent can use this hybrid backend as its command relay.
 *
 * Endpoints:
 *   POST /api/aeterna/command  — external systems queue a command (auth: RELAY_SECRET)
 *   GET  /api/aeterna/poll     — Android agent polls for next command (auth: RELAY_SECRET)
 *   GET  /api/aeterna/status   — public health/queue length (no secrets exposed)
 */

interface QueuedCommand {
  id: string;
  command: string;
  queuedAt: number;
}

const commandQueue: QueuedCommand[] = [];
const MAX_QUEUE = 256;

function authOk(provided: unknown): boolean {
  const secret = process.env.RELAY_SECRET || process.env.AETERNA_RELAY_SECRET;
  if (!secret) {
    // No secret configured -> deny by default (fail-closed)
    return false;
  }
  return typeof provided === 'string' && provided === secret;
}

export const aeternaGlassRouter = Router();

aeternaGlassRouter.get('/status', (_req, res) => {
  res.json({
    ok: true,
    service: 'AeternaGlass Relay',
    queueLength: commandQueue.length,
    secured: Boolean(process.env.RELAY_SECRET || process.env.AETERNA_RELAY_SECRET),
  });
});

aeternaGlassRouter.post('/command', (req, res) => {
  try {
    const { secret, command } = req.body ?? {};
    if (!authOk(secret)) return res.status(403).json({ error: 'Unauthorized' });
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command (string) is required' });
    }
    if (commandQueue.length >= MAX_QUEUE) {
      return res.status(429).json({ error: 'Relay queue full' });
    }
    const entry: QueuedCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      command,
      queuedAt: Date.now(),
    };
    commandQueue.push(entry);
    res.json({ status: 'Command queued', id: entry.id, queueLength: commandQueue.length });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});

aeternaGlassRouter.get('/poll', (req, res) => {
  try {
    if (!authOk(req.query.secret)) return res.status(403).json({ error: 'Unauthorized' });
    const next = commandQueue.shift();
    res.json({ command: next ?? null });
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});
