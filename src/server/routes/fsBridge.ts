/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Helper to resolve paths relative to the project root
const resolvePath = (reqPath: string) => {
  const normalizedPath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(process.cwd(), normalizedPath);
};

router.post('/read', async (req, res) => {
  try {
    const { path: filePath } = req.body;
    const fullPath = resolvePath(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ success: true, content });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    const fullPath = resolvePath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/list', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    const fullPath = resolvePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name).replace(/\\/g, '/')
    }));
    res.json({ success: true, files });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/delete', async (req, res) => {
  try {
    const { path: targetPath } = req.body;
    const fullPath = resolvePath(targetPath);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mkdir', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    const fullPath = resolvePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/exists', async (req, res) => {
  try {
    const { path: targetPath } = req.body;
    const fullPath = resolvePath(targetPath);
    try {
      await fs.access(fullPath);
      res.json({ success: true, exists: true });
    } catch {
      res.json({ success: true, exists: false });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/stat', async (req, res) => {
  try {
    const { path: targetPath } = req.body;
    const fullPath = resolvePath(targetPath);
    const stat = await fs.stat(fullPath);
    res.json({ 
      success: true, 
      stat: {
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtimeMs: stat.mtimeMs
      } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
