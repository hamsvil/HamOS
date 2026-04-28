import express from 'express';
import { LisaDaemon } from '../../sAgent/LisaDaemon';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getValidGeminiKeys } from '../../config/hardcodedKeys';
import { logger } from '../logger';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { lisaInstructRateLimiter } from '../middleware/security';
import { lisa } from '../../sAgent/LisaOrchestrator';

const router = express.Router();
let daemon: LisaDaemon | null = null;

// Dedicated logger for lisa_daemon.log
const lisaDaemonLogger = pino(
  {
    level: 'info',
    base: { name: 'lisa-instruct' },
  },
  pino.destination(path.join(process.cwd(), 'logs/lisa_daemon.log'))
);

export function setLisaDaemon(d: LisaDaemon) {
  daemon = d;
}

// Auth Middleware
async function authenticateLisa(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    }

    const token = authHeader.split(' ')[1];
    const secretsPath = path.join(process.cwd(), '.hamli-secrets.json');
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));

    if (token !== secrets.lisa_token) {
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    next();
  } catch (error) {
    (logger as any).error({ err: error }, 'Lisa Auth Error');
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}

router.get('/status', (req, res) => {
  if (!daemon) {
    return res.status(503).json({ error: 'LisaDaemon not initialized' });
  }
  res.json(daemon.getStatus());
});

router.get('/report', (req, res) => {
  if (!daemon) {
    return res.status(503).send('LisaDaemon not initialized');
  }
  res.setHeader('Content-Type', 'text/plain');
  res.send(daemon.getReport());
});

router.get('/score', (req, res) => {
  res.json(lisa.getScore());
});

router.post('/verify', async (req, res) => {
  try {
    const result = await lisa.verify();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/instruct', lisaInstructRateLimiter, authenticateLisa, async (req, res) => {
  const { command, context } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  try {
    const keys = getValidGeminiKeys();
    if (keys.length === 0) {
      throw new Error('No valid Gemini API keys available');
    }

    // Simple rotation logic
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const genAI = new GoogleGenerativeAI(apiKey);
    
    let modelName = 'gemini-2.0-flash';
    let model;
    
    try {
      model = genAI.getGenerativeModel({ model: modelName });
    } catch (e) {
      modelName = 'gemini-1.5-flash';
      model = genAI.getGenerativeModel({ model: modelName });
    }

    const systemPrompt = "Kamu adalah Lisa, sub-agent eksekutor HAM AI Studio. Jawab instruksi user dengan ringkas, akurat, dan profesional dalam Bahasa Indonesia.";
    
    const prompt = context 
      ? `System: ${systemPrompt}\nContext: ${JSON.stringify(context)}\nUser: ${command}`
      : `System: ${systemPrompt}\nUser: ${command}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    lisaDaemonLogger.info({
      command,
      context,
      response: text,
      model: modelName,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      response: text,
      timestamp: new Date().toISOString(),
      model: modelName
    });
  } catch (error: any) {
    (logger as any).error({ err: error }, 'Lisa Instruct Error');
    lisaDaemonLogger.error({
      error: error.message,
      command,
      timestamp: new Date().toISOString()
    });
    const is429 = error?.status === 429 || (error?.message ?? '').includes('429');
    const statusCode = is429 ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: is429
        ? 'Semua Gemini key sedang rate-limited. Coba lagi dalam 1 menit.'
        : 'Gagal memproses instruksi.',
      details: error.message,
      retryAfterSeconds: is429 ? 60 : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
