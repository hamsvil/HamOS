import express from 'express';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import archiver from 'archiver';
import { logger } from '../logger';

const router = express.Router();
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const ROOT = process.cwd();

function sanitizePath(unsafePath: string) {
  const safePath = path.normalize(unsafePath).replace(/^(\.\.[\/\\])+/, '');
  const finalPath = path.join(ROOT, safePath);
  if (!finalPath.startsWith(ROOT)) {
    throw new Error('Security Violation: Path outside sandbox');
  }
  return finalPath;
}

router.get('/list', async (req, res) => {
  try {
    const dir = sanitizePath(req.query.path as string || '.');
    const files = await readdir(dir);
    const details = await Promise.all(files.map(async (f) => {
      const s = await stat(path.join(dir, f));
      return {
        name: f,
        isDirectory: s.isDirectory(),
        size: s.size,
        mtime: s.mtime,
        mode: s.mode
      };
    }));
    res.json(details);
  } catch (err: any) {
    logger.error(err, 'File Explorer List Error');
    res.status(500).json({ error: err.message });
  }
});

router.get('/read', async (req, res) => {
  try {
    const filePath = sanitizePath(req.query.path as string);
    const content = await readFile(filePath, 'utf-8');
    res.send(content);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/write', async (req, res) => {
  try {
    const filePath = sanitizePath(req.body.path as string);
    await writeFile(filePath, req.body.content);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mkdir', async (req, res) => {
  try {
    const dirPath = sanitizePath(req.body.path as string);
    await mkdir(dirPath, { recursive: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete', async (req, res) => {
  try {
    const target = sanitizePath(req.query.path as string);
    const s = await stat(target);
    if (s.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      await unlink(target);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rename', async (req, res) => {
  try {
    const oldPath = sanitizePath(req.body.oldPath);
    const newPath = sanitizePath(req.body.newPath);
    await rename(oldPath, newPath);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/checksum', async (req, res) => {
  try {
    const filePath = sanitizePath(req.query.path as string);
    const buffer = await readFile(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    res.json({ sha256: hash });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
