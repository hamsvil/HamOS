import express from 'express';
import { apkBuilder } from '../services/apkBuilder';
import path from 'path';
import fs from 'fs';
import { logger } from '../logger';
import { z } from 'zod';

const router = express.Router();

const buildConfigSchema = z.object({
  appName: z.string().min(1),
  packageName: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});

// Auth Middleware (Reuse from lisa.ts logic)
async function authenticateLisa(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    }

    const token = authHeader.split(' ')[1];
    const secretsPath = path.join(process.cwd(), '.hamli-secrets.json');
    
    if (!fs.existsSync(secretsPath)) {
      logger.error('Secrets file missing');
      return res.status(500).json({ error: 'System configuration error' });
    }

    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));

    if (token !== secrets.lisa_token) {
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    next();
  } catch (error) {
    logger.error({ err: error }, 'APK Auth Error');
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}

router.post('/prepare', authenticateLisa, async (req, res) => {
  try {
    const { type = 'source-zip', config } = req.body;
    const io = req.app.get('io');

    const validation = buildConfigSchema.safeParse(config);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid configuration', details: validation.error.format() });
    }

    if (type !== 'source-zip' && type !== 'android-native') {
      return res.status(400).json({ error: 'Invalid build type' });
    }

    const buildId = apkBuilder.startBuild(type as 'source-zip' | 'android-native', validation.data, io);
    res.status(202).json({ buildId, status: 'pending', message: 'Build preparation started' });
  } catch (error: any) {
    logger.error({ err: error }, 'APK Prepare Error');
    res.status(500).json({ error: error.message || 'Failed to start build preparation' });
  }
});

router.get('/status/:buildId', (req, res) => {
  try {
    const { buildId } = req.params;
    const status = apkBuilder.getStatus(buildId);
    if (!status) {
      return res.status(404).json({ error: 'Build not found' });
    }
    
    res.json({
      status: status.status,
      progress: status.progress,
      lastBuildAt: status.lastBuildAt,
      error: status.error
    });
  } catch (error: any) {
    logger.error({ err: error }, 'APK Status Error');
    res.status(500).json({ error: 'Failed to fetch build status' });
  }
});

router.get('/download/:buildId', (req, res) => {
  try {
    const { buildId } = req.params;
    const status = apkBuilder.getStatus(buildId);
    
    if (!status) {
      return res.status(404).json({ error: 'Build not found' });
    }

    if (status.status !== 'success' || !status.downloadPath) {
      return res.status(400).json({ error: 'Build not ready for download', currentStatus: status.status });
    }

    const filePath = path.resolve(status.downloadPath);
    if (!fs.existsSync(filePath)) {
      logger.error({ filePath, buildId }, 'Download file missing on disk');
      return res.status(410).json({ error: 'Build artifact has been removed or is missing' });
    }

    res.download(filePath, `android-source-${buildId}.zip`, (err) => {
      if (err) {
        logger.error({ err, buildId }, 'Error during file download stream');
      }
    });
  } catch (error: any) {
    logger.error({ err: error }, 'APK Download Error');
    res.status(500).json({ error: 'Failed to initiate download' });
  }
});

export default router;

