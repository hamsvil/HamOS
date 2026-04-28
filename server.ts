import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import http from 'http';
import chokidar from 'chokidar';
import { Server as SocketIOServer } from 'socket.io';
import { ServerGeminiAgent } from './keygen_gem/server_agent';

// Import Routes and Logic
import geminiRouter from './src/server/routes/gemini';
import privateSourceRouter from './src/server/routes/privateSource';
import tunnelRouter from './src/server/routes/tunnel';
import shellRouter from './src/server/routes/shell';
import { setupWebSocket, setupUIUpdateSocket, emitComponentRefresh } from './src/server/socket';
import { setupTerminalSocket } from './src/server/terminalSocket';
import { setupProxyRoutes } from './src/server/serverProxy';
import { sysErrorRouter } from './src/server/routes/sysError';
import { agentWorkerRouter } from './src/server/routes/agentWorker';
import { agentObservabilityRouter } from './src/server/routes/agentObservability';
import { stateRouter } from './src/server/routes/state';
import socialWorkerRouter from './src/server/routes/socialWorker';
import lisaRouter, { setLisaDaemon } from './src/server/routes/lisa';
import storageRouter from './src/server/routes/storage';
import apkRouter from './src/server/routes/apk';
import browserRouter from './src/server/routes/browser';
import { LisaDaemon } from './src/sAgent/LisaDaemon';
import { globalRateLimiter, stateRateLimiter, agentRateLimiter } from './src/server/middleware/security';
import { logger } from './src/server/logger';

import { SwarmOrchestrator } from './src/sAgent/subagent/SwarmOrchestrator';
import { AutonomousManager } from './src/sAgent/subagent/AutonomousManager';

async function startServer() {
  const app = express();
  const server = http.createServer();
  const PORT = Number(process.env.PORT) || 3000;

  // Setup Socket.IO for Terminal FIRST
  const io = new SocketIOServer(server, {
    path: '/terminal-socket/',
    destroyUpgrade: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  setupTerminalSocket(io);
  setupUIUpdateSocket(io);
  (app as any).io = io;
  app.set('server', { io });

  // Setup WebSocket (Yjs) FIRST
  await setupWebSocket(server);

  // THEN attach Express
  server.on('request', app);
  app.set('server', server);

  app.set('trust proxy', 1); // Trust first proxy for rate limiting

  // --- SAFE MIDDLEWARE HELPERS ---
  const safeSetHeader = (res: any, name: string, value: string) => {
    if (!res.headersSent && !res.writableEnded) {
      res.setHeader(name, value);
    }
  };

  const safeMiddleware = (fn: any) => (req: any, res: any, next: any) => {
    if (res.headersSent || res.writableEnded) return next();
    return fn(req, res, next);
  };
  // --- END HELPERS ---

  app.use(globalRateLimiter);

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(express.raw({ type: '*/*', limit: '5mb' }));
  
  // WebContainer Headers - Required for SharedArrayBuffer
  app.use((req, res, next) => {
    if (res.headersSent || res.writableEnded) return next();
    safeSetHeader(res, 'Cross-Origin-Opener-Policy', 'same-origin');
    safeSetHeader(res, 'Cross-Origin-Embedder-Policy', 'require-corp');
    safeSetHeader(res, 'Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // Ensure static files are served with correct headers and NO redirects
  app.use((req, res, next) => {
    if (res.headersSent || res.writableEnded) return next();
    
    if (req.path.endsWith('.wasm')) {
      safeSetHeader(res, 'Content-Type', 'application/wasm');
      safeSetHeader(res, 'Cross-Origin-Opener-Policy', 'same-origin');
      safeSetHeader(res, 'Cross-Origin-Embedder-Policy', 'require-corp');
      safeSetHeader(res, 'Cross-Origin-Resource-Policy', 'cross-origin');
      
      // Try to serve from node_modules if it's a known wasm file
      const filename = path.basename(req.path);
      let wasmPath = '';
      
      if (filename === 'sql-wasm.wasm') {
        wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
      } else if (filename === 'sqlite3.wasm') {
        wasmPath = path.join(process.cwd(), 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist', 'sqlite3.wasm');
      } else if (filename === 'web-tree-sitter.wasm' || filename === 'tree-sitter.wasm') {
        wasmPath = path.join(process.cwd(), 'node_modules', 'web-tree-sitter', 'web-tree-sitter.wasm');
      } else if (filename.startsWith('tree-sitter-')) {
        wasmPath = path.join(process.cwd(), 'node_modules', 'tree-sitter-wasms', 'out', filename);
      }
      
      if (wasmPath) {
        return res.sendFile(wasmPath, (err) => {
          if (err && !res.headersSent) {
            res.status(404).send('WASM file error');
          }
        });
      }
      
      // Check if it exists in public directory
      const publicPath = path.join(process.cwd(), 'public', req.path);
      return res.sendFile(publicPath, (err) => {
        if (err && !res.headersSent) {
          res.status(404).send('WASM file not found');
        }
      });
    }
    next();
  });

  app.use(express.static(path.join(process.cwd(), 'public'), {
    setHeaders: (res, path) => {
      if (!res.headersSent && !res.writableEnded) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        if (path.endsWith('sw.js')) {
          res.setHeader('Service-Worker-Allowed', '/');
        }
      }
    }
  }));

  app.get('/sw.js', (req, res) => {
    if (res.headersSent || res.writableEnded) return;
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
  });

  // console.log('JSON database initialized.');

  // Health Check Route (Required by AI Studio Platform)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/healthz', (req, res) => res.send('ok'));
  app.get('/readyz', (req, res) => res.send('ok'));
  app.get('/metrics', (req, res) => {
    const uptime = process.uptime();
    res.set('Content-Type', 'text/plain');
    res.send(`process_uptime_seconds ${uptime}\nhttp_requests_total 0`);
  });

  // Log Route for Debugging
  app.post('/api/log', (req, res) => {
    const logData = JSON.stringify(req.body);
    // console.log('[Frontend Log]', logData);
    fs.appendFileSync('frontend_error.log', logData + '\n');
    res.json({ success: true });
  });

  // Global Rewrite /ham-api to /api
  app.use((req, res, next) => {
    if (res.headersSent || res.writableEnded) return next();
    if (req.url.startsWith('/ham-api')) {
      req.url = req.url.replace('/ham-api', '/api');
    }
    next();
  });

  // Mount Routes (Cloud Fortress)
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  const apiCors = safeMiddleware(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-private-source-auth', 'x-goog-api-key']
  }));
  
  app.use('/api', (req, res, next) => {
    if (res.headersSent || res.writableEnded) return next();
    safeSetHeader(res, 'Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, apiCors);
  app.use('/api', geminiRouter);
  app.use('/api/private-source', privateSourceRouter);
  app.use('/api/tunnel', tunnelRouter);
  app.use('/api/shell', shellRouter);
  app.use('/api/sys-error', sysErrorRouter);
  app.use('/api/agent-worker', agentRateLimiter, agentWorkerRouter);
  app.use('/api/agent-obs', agentObservabilityRouter); // [HYBRID-L2] Agent Observability
  app.use('/api/state', stateRateLimiter, stateRouter);
  app.use('/api/social-worker', socialWorkerRouter);
  app.use('/api/lisa', lisaRouter);
  app.use('/api/storage', storageRouter);
  app.use('/api/apk', apkRouter);
  app.use('/api/browser', browserRouter);

  // [HYBRID-L2] AeternaGlass Relay (Android floating AI agent command bridge)
  console.log('[Server] Importing aeternaGlassRouter...');
  const { aeternaGlassRouter } = await import('./src/server/routes/aeternaGlass');
  console.log('[Server] aeternaGlassRouter imported.');
  app.use('/api/aeterna', aeternaGlassRouter);

  // [HYBRID-L2] Blueprint Features
  console.log('[Server] Importing mediaAgentRouter and generatorStudioRouter...');
  const { mediaAgentRouter } = await import('./src/server/routes/mediaAgent');
  const { generatorStudioRouter } = await import('./src/server/routes/generatorStudio');
  console.log('[Server] Routers imported.');
  app.use('/api/media-agent', mediaAgentRouter);
  app.use('/api/generator-studio', generatorStudioRouter);

  // The Great Proxy: Dynamic API Bridge & HTML Rewriter (The Singularity Engine v9 - The Singularity Window)
  setupProxyRoutes(app);

  // Special Routes
  // Removed legacy routes

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: { server } // Pass our HTTP server to Vite for HMR WebSockets
        },
        optimizeDeps: {
          force: false
        },
        appType: 'spa',
        root: process.cwd(), // Set root to the current working directory (project root)
      });
  app.use((req, res, next) => {
    if (res.headersSent || res.writableEnded) return;
    vite.middlewares(req, res, next);
  });
      console.log('[Vite] Middleware component successfully attached.');
    } catch (err) {
      console.error('[Vite] Initialization failed:', err);
    }
  } else {
    console.log('[Server] Running in PRODUCTION mode.');
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      const indexPath = path.resolve(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application not built. Run "npm run build" first.');
      }
    });
  }

  // Defensive Error Handler for "Headers already sent"
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.code === 'ERR_HTTP_HEADERS_SENT') {
      logger.warn({ url: req.url, method: req.method }, '[Server] Caught ERR_HTTP_HEADERS_SENT - suppressing crash');
      return;
    }
    next(err);
  });

  let eternalMoverInterval: NodeJS.Timeout | null = null;

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);

    // ── Keygen Gem — Background Service (24/7, tanpa jeda) ──
    try {
      const CLONE_COUNT = parseInt(process.env.KEYGEN_CLONES || '500', 10);
      const keygenAgent = new ServerGeminiAgent();
      keygenAgent.adjustSwarmSize(CLONE_COUNT);
      // keygenAgent.start();
      console.log(`[KeygenGem] ⚠️ Background service DISABLED by request.`);
      console.log(`[KeygenGem]    Valid keys → logs/valid_keys.log`);

      // Graceful shutdown ikut proses server
      const stopKeygen = () => { try { keygenAgent.stop(); } catch (_) {} };
      process.once('SIGTERM', stopKeygen);
      process.once('SIGINT',  stopKeygen);
    } catch (e) {
      console.error('[KeygenGem] Gagal boot background service:', e);
    }

    // ── Agent 24: The Eternal Mover — Autonomous Project Governance ──
    try {
      const ERROR_LOG_PATH = path.resolve(process.cwd(), 'erorr_console.log');
      fs.appendFileSync(ERROR_LOG_PATH, `[${new Date().toISOString()}] SERVER BOOTED - LISTENING ON PORT ${PORT}\n----------------------------------\n`);
      
      const orchestrator = new SwarmOrchestrator();
      const manager = new AutonomousManager(orchestrator);
      
      // Schedule periodic cycles every 1 minute
      const scheduleMover = () => {
        setTimeout(async () => {
          try {
            await manager.startCycle();
          } catch (err) {
            console.error('[EternalMover] Periodic cycle error:', err);
          }
          scheduleMover();
        }, 60 * 1000);
      };
      scheduleMover();
      
      console.log('[EternalMover] Autonomous Governance ENABLED (Aggressive Evolution Mode).');
    } catch (e) {
      console.error('[EternalMover] Failed to boot autonomous governor:', e);
    }

    // ── LisaDaemon — Autonomous System Monitoring ──
    try {
      const lisaDaemon = new LisaDaemon();
      lisaDaemon.start({ enable_zero: true, intervalMs: 60000 });
      setLisaDaemon(lisaDaemon);
      console.log('[LisaDaemon] ✅ Autonomous Monitoring ENABLED by request (enable_zero: true, 1 hour interval).');

      const stopLisa = () => { try { lisaDaemon.stop(); } catch (_) {} };
      process.once('SIGTERM', stopLisa);
      process.once('SIGINT',  stopLisa);
    } catch (e) {
      console.error('[LisaDaemon] Failed to boot lisa daemon:', e);
    }

    // ── Server-side Chokidar Watcher ──
    const watcher = chokidar.watch('src/components', {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
    });
    watcher.on('change', (filePath) => {
      const componentName = path.basename(filePath, path.extname(filePath));
      emitComponentRefresh(componentName);
      logger.info({ componentName, filePath }, '[LiveUpdate] Component file changed');
    });
    (app as any).chokidarWatcher = watcher;
  });

  // Global Graceful Shutdown for Socket and Intervals
  const gracefulShutdown = () => {
    if ((app as any).chokidarWatcher) {
      (app as any).chokidarWatcher.close().then(() => console.log('[Chokidar] Watcher closed.'));
    }
    if (eternalMoverInterval) {
      clearInterval(eternalMoverInterval);
      console.log('[EternalMover] Interval cleared.');
    }
    
    // Close Socket.IO
    io.close(() => {
      console.log('[Socket.IO] Terminal socket closed.');
    });

    // server.close() normally handled by process manager or vite, but good practice
  };

  process.once('SIGTERM', gracefulShutdown);
  process.once('SIGINT', gracefulShutdown);
}

startServer().catch(err => {
  console.error('CRITICAL: Failed to start server:', err);
  process.exit(1);
});
