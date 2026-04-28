/* eslint-disable no-useless-assignment */
import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Real shell execution endpoint
router.post('/shell', (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Perintah tidak boleh kosong' });
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.json({ output: stderr || error.message, isError: true });
    }
    res.json({ output: stdout, isError: false });
  });
});

// Extension Marketplace API
router.get('/marketplace/extensions', (req, res) => {
  res.json([
    { id: 'ham-hello-world', name: 'Hello World', version: '1.0.0', description: 'A real extension example.', author: 'HamEngine', icon: 'Sparkles', url: '/extensions/hello-world.js', status: 'preview', installable: false },
    { id: 'ham-theme-dark-pro', name: 'Dark Pro Theme', version: '1.2.0', description: 'A premium dark theme for Ham AiStudio.', author: 'HamEngine', icon: 'Layout', status: 'coming_soon', installable: false },
    { id: 'ham-git-lens', name: 'GitLens+', version: '2.0.1', description: 'Supercharge your Git integration with advanced history and blame.', author: 'GitMaster', icon: 'GitBranch', status: 'coming_soon', installable: false },
    { id: 'ham-ai-copilot', name: 'AI Copilot Pro', version: '3.0.0', description: 'Advanced AI code completion and refactoring.', author: 'AILabs', icon: 'Sparkles', status: 'coming_soon', installable: false },
    { id: 'ham-prettier', name: 'Prettier', version: '1.5.0', description: 'Opinionated code formatter for consistent style.', author: 'HamEngine', icon: 'Code', status: 'coming_soon', installable: false },
    { id: 'ham-docker-manager', name: 'Docker Manager', version: '0.8.0', description: 'Manage your containers directly from the IDE.', author: 'DevOpsTools', icon: 'Package', status: 'coming_soon', installable: false },
    { id: 'ham-sqlite-viewer', name: 'SQLite Viewer', version: '1.1.0', description: 'Browse and edit SQLite databases visually.', author: 'DataMaster', icon: 'Database', status: 'coming_soon', installable: false }
  ]);
});

// Serve sql-wasm.wasm
// Note: This is typically served at the root, so we might need to mount it specially in server.ts
// But we can export a handler here
export const sqlWasmHandler = (req: express.Request, res: express.Response) => {
  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  if (fs.existsSync(wasmPath)) {
    res.sendFile(wasmPath);
  } else {
    res.status(404).send('sql-wasm.wasm not found');
  }
};

export default router;
