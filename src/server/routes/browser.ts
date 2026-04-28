import express from 'express';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { logger } from '../logger';

const router = express.Router();

// In-memory cookie store
const cookieStore = new Map<string, any[]>();

// Auth Middleware
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
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
    logger.error({ err: error }, 'Browser API Auth Error');
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}

router.post('/screenshot', authenticate, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const possiblePaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/nix/store/3iddmc2cy4gb4ki0qkigm1yd8pdndw9j-chromium-unwrapped-131.0.6778.204/libexec/chromium/chromium',
      '/nix/store/23r7pl4871g595jvs0wqkb5bn5jhma7s-chromium-unwrapped-123.0.6312.105/libexec/chromium/chromium',
      '/nix/store/14l09yxjrwmd7k419ryhz9py7q16qj28-chromium-unwrapped-98.0.4758.102/libexec/chromium/chromium',
      '/nix/store/104vnzh385c7f0i7891awmvp026fyryk-chromium-unwrapped-92.0.4515.159/libexec/chromium/chromium',
      '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
    ].filter(Boolean);

    let executablePath = '';
    for (const p of possiblePaths) {
      if (p && fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
      headless: true,
      executablePath: executablePath || undefined
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const timestamp = Date.now();
    const screenshotDir = path.join(process.cwd(), 'public/screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    const filename = `${timestamp}.png`;
    const filePath = path.join(screenshotDir, filename);
    await page.screenshot({ path: filePath, fullPage: true });
    await browser.close();

    logger.info({ url, screenshotUrl: `/screenshots/${filename}` }, 'Screenshot taken');
    res.json({ screenshotUrl: `/screenshots/${filename}` });
  } catch (error: any) {
    logger.error({ err: error, url }, 'Screenshot failed');
    res.status(500).json({ error: 'Screenshot failed', details: error.message });
  }
});

router.get('/cookies', authenticate, (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: 'Domain is required' });
  res.json({ cookies: cookieStore.get(domain as string) || [] });
});

router.post('/cookies', authenticate, (req, res) => {
  const { domain, cookies } = req.body;
  if (!domain || !cookies) return res.status(400).json({ error: 'Domain and cookies are required' });
  cookieStore.set(domain, cookies);
  res.json({ success: true });
});

router.delete('/cookies', authenticate, (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'Domain is required' });
  cookieStore.delete(domain);
  res.json({ success: true });
});

export default router;
