import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logger';

const router = express.Router();

// Auth Middleware (Reused from lisa.ts logic)
async function authenticateLisa(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    }

    const token = authHeader.split(' ')[1];
    const secretsPath = path.join(process.cwd(), '.hamli-secrets.json');
    if (!fs.existsSync(secretsPath)) {
      return res.status(500).json({ error: 'Secrets file missing' });
    }
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));

    if (token !== secrets.lisa_token) {
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    next();
  } catch (error) {
    (logger as any).error({ err: error }, 'Storage Auth Error');
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}

// APK Command Queue
const apkCommands: any[] = [];

router.use(authenticateLisa);

router.get('/list', (req, res) => {
  const dirPath = req.query.path as string || '.';
  try {
    const absolutePath = path.resolve(process.cwd(), dirPath);
    if (!absolutePath.startsWith(process.cwd())) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const items = fs.readdirSync(absolutePath).map(name => {
      const stats = fs.statSync(path.join(absolutePath, name));
      return {
        name,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime
      };
    });
    res.json({ success: true, items });
  } catch (error: any) {
    logger.error({ err: error, path: dirPath }, 'Storage List Error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/write', (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'Path and content required' });
  }
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!absolutePath.startsWith(process.cwd())) {
      return res.status(403).json({ error: 'Access denied' });
    }
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
    res.json({ success: true, message: 'File written successfully' });
  } catch (error: any) {
    logger.error({ err: error, path: filePath }, 'Storage Write Error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/read', (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!absolutePath.startsWith(process.cwd())) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const content = fs.readFileSync(absolutePath, 'utf8');
    res.json({ success: true, content });
  } catch (error: any) {
    logger.error({ err: error, path: filePath }, 'Storage Read Error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/delete', (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!absolutePath.startsWith(process.cwd())) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (fs.statSync(absolutePath).isDirectory()) {
      fs.rmdirSync(absolutePath, { recursive: true });
    } else {
      fs.unlinkSync(absolutePath);
    }
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    logger.error({ err: error, path: filePath }, 'Storage Delete Error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/apk-command', (req, res) => {
  const { command, params } = req.body;
  if (!command) return res.status(400).json({ error: 'Command required' });
  
  const cmd = {
    id: Date.now().toString(),
    command,
    params,
    timestamp: new Date().toISOString()
  };
  
  apkCommands.push(cmd);
  logger.info({ cmd }, 'APK command queued');
  res.json({ success: true, commandId: cmd.id });
});

router.get('/apk-poll', (req, res) => {
  const commands = [...apkCommands];
  apkCommands.length = 0; // Clear queue
  res.json({ success: true, commands });
});

export default router;
