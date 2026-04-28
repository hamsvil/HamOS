/* eslint-disable no-useless-assignment */
// [MEMORY LEAK] Cleanup verified.
import express, { Express } from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Server } from 'http';

// Import Routes
import geminiRouter from '../routes/gemini';
import privateSourceRouter from '../routes/privateSource';
import tunnelRouter from '../routes/tunnel';
import proxyRouter from '../routes/proxy';
import readerRouter from '../routes/reader';
import shellRouter from '../routes/shell';
import projectsRouter from '../routes/projects';
import supremeToolsRouter from '../routes/supremeTools';
import systemRouter from '../routes/system';
import webRouter from '../routes/web';
import hamliRouter from '../routes/hamli';
import fileExplorerRouter from '../routes/fileExplorer';

// NOTE: sAgentRouter import dipindah ke dynamic-import di runtime.
// Static import sebelumnya membuat Vite scanner mencoba meresolusi
// paket monorepo (@workspace/db dsb) yang tidak ada di proyek hybrid ini.
// File `src/sAgent/subagent/**` adalah scaffold internal (lihat AGENTS.md §5)
// yang sudah dideny di vite.config.ts.
// @ts-ignore
const sAgentRouter: any = (req: any, res: any, next: any) => next();

import { cleanupTask } from '../routes/privateSourceService';

/**
 * The Singularity App Engine
 * Configures Express middleware, routes, and Vite integration.
 * 
 * // LEGACY — tidak dipanggil dari server.ts. Pertahankan sebagai referensi.
 */
let globalCleanupInterval: NodeJS.Timeout | null = null;

export async function createApp(app: Express, server: Server) {
  // Start cleanup task
  if (globalCleanupInterval) clearInterval(globalCleanupInterval);
  globalCleanupInterval = setInterval(cleanupTask, 60 * 60 * 1000); // Every hour
  if (globalCleanupInterval.unref) globalCleanupInterval.unref();
  
  let isViteReady = process.env.NODE_ENV === 'production';

  // 1. Configure Express Middleware
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.raw({ type: '*/*', limit: '50mb' }));

  // 2. Booting Middleware (Anti-Blank Screen)
  // This middleware will show a booting screen until Vite is fully ready.
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production' && !isViteReady && !req.path.startsWith('/api/') && !req.path.startsWith('/terminal-socket/')) {
      res.send(`
        <html>
          <head>
            <title>HAM OS Booting...</title>
            <style>
              body { background: #050505; color: #00ff00; font-family: 'Courier New', monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; flex-direction: column; text-shadow: 0 0 5px #00ff00; }
              .loader { width: 300px; height: 2px; background: #111; position: relative; margin-top: 20px; overflow: hidden; }
              .loader::after { content: ''; position: absolute; left: -100%; width: 100%; height: 100%; background: #00ff00; animation: loading 2s infinite; }
              @keyframes loading { 0% { left: -100%; } 100% { left: 100%; } }
            </style>
          </head>
          <body>
            <h1 style="letter-spacing: 5px;">[THE SINGULARITY]</h1>
            <p>HAM OS QUANTUM ENGINE BOOTING...</p>
            <div class="loader"></div>
            <p style="font-size: 10px; opacity: 0.5; margin-top: 40px;">Initializing Vite Toolchain & WebSockets...</p>
            <script>setTimeout(() => location.reload(), 2000)</script>
          </body>
        </html>
      `);
      return;
    }
    next();
  });

  // 3. Static Files & Health
  app.use((req, res, next) => {
    if (req.path.endsWith('.wasm')) {
      res.type('application/wasm');
      
      // Try to serve from node_modules if it's a known wasm file
      const filename = path.basename(req.path);
      let wasmPath = '';
      
      if (filename === 'sql-wasm.wasm') {
        wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
      } else if (filename === 'sqlite3.wasm') {
        wasmPath = path.join(process.cwd(), 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist', 'sqlite3.wasm');
      } else if (filename === 'tree-sitter.wasm' || filename === 'web-tree-sitter.wasm') {
        wasmPath = path.join(process.cwd(), 'node_modules', 'web-tree-sitter', 'web-tree-sitter.wasm');
      } else if (filename === 'tree-sitter-typescript.wasm') {
        wasmPath = path.join(process.cwd(), 'node_modules', 'tree-sitter-wasms', 'out', 'tree-sitter-typescript.wasm');
      } else if (filename === 'tree-sitter-tsx.wasm') {
        wasmPath = path.join(process.cwd(), 'node_modules', 'tree-sitter-wasms', 'out', 'tree-sitter-tsx.wasm');
      }
      
      if (wasmPath && fs.existsSync(wasmPath)) {
        return res.sendFile(wasmPath);
      }
      
      // Check if it exists in public directory
      const publicPath = path.join(process.cwd(), 'public', req.path);
      if (fs.existsSync(publicPath)) {
        return res.sendFile(publicPath);
      }
      
      // If not found, return 404 to prevent SPA fallback from serving index.html
      return res.status(404).send('WASM file not found');
    }
    next();
  });

  app.get('/sw.js', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
  });

  app.use(express.static(path.join(process.cwd(), 'public')));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/log', (req, res) => {
    const logData = JSON.stringify(req.body);
    console.log('[Frontend Log]', logData);
    fs.appendFileSync('frontend_error.log', logData + '\n');
    res.json({ success: true });
  });

  // 4. Mount API Routes
  const apiCors = cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-private-source-auth', 'x-goog-api-key']
  });
  
  app.use('/api', apiCors);
  app.use('/ham-api', apiCors);

  ['/api', '/ham-api'].forEach((prefix) => {
    app.use(prefix, geminiRouter);
    app.use(`${prefix}/private-source`, privateSourceRouter);
    app.use(`${prefix}/tunnel`, tunnelRouter);
    app.use(`${prefix}/proxy`, proxyRouter);
    app.use(`${prefix}/reader`, readerRouter);
    app.use(`${prefix}/shell`, shellRouter);
    app.use(`${prefix}/projects`, projectsRouter);
    app.use(`${prefix}/supreme`, supremeToolsRouter);
    app.use(prefix, systemRouter); // root of prefix for health etc
    app.use(prefix, webRouter);
    app.use(prefix, hamliRouter); // hamli internally defines /app-status etc
    app.use(`${prefix}/file-explorer`, fileExplorerRouter);
  });

  app.use('/sagent-api', sAgentRouter);

  // 5. Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: { server } 
        },
        appType: 'spa',
        root: process.cwd(),
      });
      app.use(vite.middlewares);
      isViteReady = true;
      console.log('[The Singularity] Vite Toolchain Ready.');
    } catch (err) {
      console.error('[The Singularity] Vite Initialization Failed:', err);
    }
  } else {
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

  return app;
}
