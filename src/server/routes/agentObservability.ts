import { Router } from 'express';
import { EventEmitter } from 'events';

const router = Router();
const eventBus = new EventEmitter();

// In-memory cache for SSE (tail of logs/results)
const logCache: any[] = [];
const resultCache: any[] = [];
const MAX_CACHE = 100;

router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 200;
  const since = parseInt(req.query.since as string) || 0;
  
  const filtered = logCache
    .filter(l => l.timestamp > since)
    .slice(-limit);
    
  res.json(filtered);
});

router.post('/logs', (req, res) => {
  const log = req.body;
  logCache.push(log);
  if (logCache.length > MAX_CACHE) logCache.shift();
  eventBus.emit('log', log);
  res.json({ success: true });
});

router.get('/results', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const since = parseInt(req.query.since as string) || 0;
  
  const filtered = resultCache
    .filter(r => r.timestamp > since)
    .slice(-limit);
    
  res.json(filtered);
});

router.post('/results', (req, res) => {
  const result = req.body;
  resultCache.push(result);
  if (resultCache.length > MAX_CACHE) resultCache.shift();
  eventBus.emit('result', result);
  res.json({ success: true });
});

router.delete('/logs', (req, res) => {
  logCache.length = 0;
  res.json({ success: true });
});

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const onLog = (log: any) => {
    res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
  };

  const onResult = (result: any) => {
    res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`);
  };

  eventBus.on('log', onLog);
  eventBus.on('result', onResult);

  req.on('close', () => {
    eventBus.off('log', onLog);
    eventBus.off('result', onResult);
  });
});

export { router as agentObservabilityRouter };
