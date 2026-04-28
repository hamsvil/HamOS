/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import express from 'express';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { 
  getSafePath, 
  broadcast, 
  logAudit, 
  getDirSize,
  saveMetadata,
  getMetadata
} from './privateSourceService';

const ROOT_DIR = process.cwd();

let diskUsageCache: { totalSize: number; timestamp: number } | null = null;
const DISK_USAGE_TTL = 60000; // 1 minute

export const registerFileOperations = (router: express.Router) => {
  // Disk Usage
  router.post('/disk-usage', async (req, res) => {
    try {
      const now = Date.now();
      if (diskUsageCache && (now - diskUsageCache.timestamp < DISK_USAGE_TTL)) {
        return res.json({ totalSize: diskUsageCache.totalSize });
      }

      const totalSize = await getDirSize(ROOT_DIR);
      diskUsageCache = { totalSize, timestamp: now };
      res.json({ totalSize });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List directory
  router.post('/list', async (req, res) => {
    try {
      const { dirPath = '' } = req.body;
      const safePath = getSafePath(dirPath);
      
      if (!fs.existsSync(safePath)) {
        return res.status(404).json({ error: 'Directory not found' });
      }

      if (!fs.statSync(safePath).isDirectory()) {
        return res.status(400).json({ error: 'Path is not a directory' });
      }

      await logAudit('LIST', dirPath);
      const items = await fs.promises.readdir(safePath, { withFileTypes: true });
      const result = await Promise.all(items
        .filter(item => dirPath !== '' || (item.name !== '.trash' && item.name !== '.tmp_uploads'))
        .map(async item => {
        try {
          const fullPath = path.join(safePath, item.name);
          const stats = await fs.promises.stat(fullPath);
          const itemPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
          let metadata = null;
          if (dirPath === '.trash') {
            metadata = await getMetadata(itemPath);
          }
          return {
            name: item.name,
            isDirectory: item.isDirectory(),
            path: itemPath,
            size: item.isDirectory() ? 0 : stats.size,
            modifiedAt: stats.mtimeMs,
            metadata
          };
        } catch (e) {
          return { 
            name: item.name, 
            isDirectory: item.isDirectory(), 
            path: path.join(dirPath, item.name).replace(/\\/g, '/'), 
            size: 0, 
            modifiedAt: 0 
          };
        }
      }));

      result.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
        return a.isDirectory ? -1 : 1;
      });

      res.json({ items: result });
    } catch (error: any) {
      console.error(`[ERROR] Error listing directory: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Read file
  router.post('/read', async (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath || typeof filePath !== 'string') throw new Error('Invalid filePath');
      const safePath = getSafePath(filePath);
      if (!fs.existsSync(safePath)) throw new Error('File not found');
      const stats = fs.statSync(safePath);
      if (stats.isDirectory()) throw new Error('Cannot read a directory');
      if (stats.size > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)');
      
      await logAudit('READ', filePath);
      const content = await fs.promises.readFile(safePath, 'utf-8');
      res.json({ content });
    } catch (error: any) {
      console.error(`[ERROR] Error reading file: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Write file
  router.post('/write', async (req, res) => {
    try {
      const { filePath, content } = req.body;
      if (!filePath || typeof filePath !== 'string') throw new Error('Invalid filePath');
      if (content && content.length > 10 * 1024 * 1024) throw new Error('Content too large (max 10MB)');
      
      const safePath = getSafePath(filePath);
      if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) throw new Error('Cannot overwrite directory');
      
      const dir = path.dirname(safePath);
      if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });
      
      await logAudit('WRITE', filePath);
      await fs.promises.writeFile(safePath, content || '', 'utf-8');
      broadcast(req, 'FILE_MODIFIED', { path: filePath });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error writing file: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Create folder
  router.post('/mkdir', async (req, res) => {
    try {
      const { dirPath } = req.body;
      if (!dirPath || typeof dirPath !== 'string') throw new Error('Invalid dirPath');
      const safePath = getSafePath(dirPath);
      
      if (fs.existsSync(safePath)) {
        if (fs.statSync(safePath).isDirectory()) {
          return res.json({ success: true, message: 'Already exists' });
        }
        throw new Error('Path exists but is not a directory');
      }
      
      await logAudit('MKDIR', dirPath);
      await fs.promises.mkdir(safePath, { recursive: true });
      broadcast(req, 'FILE_CREATED', { path: dirPath, isDirectory: true });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error creating folder: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete file/folder
  router.post('/delete', async (req, res) => {
    try {
      const { targetPath } = req.body;
      if (!targetPath || typeof targetPath !== 'string') throw new Error('Invalid targetPath');
      const safePath = getSafePath(targetPath);
      if (!fs.existsSync(safePath)) throw new Error('Target not found');
      
      await logAudit('DELETE', targetPath);
      
      if (targetPath.startsWith('.trash')) {
        const stat = await fs.promises.stat(safePath);
        if (stat.isDirectory()) {
          await fs.promises.rm(safePath, { recursive: true, force: true });
        } else {
          await fs.promises.unlink(safePath);
        }
      } else {
        const trashDir = path.join(ROOT_DIR, '.trash');
        if (!fs.existsSync(trashDir)) {
          await fs.promises.mkdir(trashDir, { recursive: true });
        }
        const timestamp = Date.now();
        const trashName = `${timestamp}-${path.basename(safePath)}`;
        const trashPath = path.join(trashDir, trashName);
        
        // Save original path in metadata before moving
        await saveMetadata(safePath, { originalPath: safePath });
        
        await fs.promises.rename(safePath, trashPath);
        
        // Move metadata to trash as well
        const metaPath = path.join(ROOT_DIR, '.metadata', `${Buffer.from(safePath).toString('base64')}.json`);
        const newMetaPath = path.join(ROOT_DIR, '.metadata', `${Buffer.from(trashPath).toString('base64')}.json`);
        if (fs.existsSync(metaPath)) {
          await fs.promises.rename(metaPath, newMetaPath);
        }
      }

      broadcast(req, 'FILE_DELETED', { path: targetPath });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error deleting: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Batch Delete
  router.post('/batch-delete', async (req, res) => {
    try {
      const { targetPaths } = req.body;
      if (!targetPaths || !Array.isArray(targetPaths)) throw new Error('Invalid targetPaths');
      
      const trashDir = path.join(ROOT_DIR, '.trash');
      if (!fs.existsSync(trashDir)) {
        await fs.promises.mkdir(trashDir, { recursive: true });
      }

      for (const p of targetPaths) {
        const safePath = getSafePath(p);
        if (fs.existsSync(safePath)) {
          logAudit('BATCH_DELETE', p);
          if (p.startsWith('.trash')) {
            const stat = await fs.promises.stat(safePath);
            if (stat.isDirectory()) {
              await fs.promises.rm(safePath, { recursive: true, force: true });
            } else {
              await fs.promises.unlink(safePath);
            }
          } else {
            const trashPath = path.join(trashDir, `${Date.now()}-${path.basename(safePath)}`);
            await fs.promises.rename(safePath, trashPath);
          }
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error in batch delete: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Move/Rename
  router.post('/move', async (req, res) => {
    try {
      const { sourcePath, destPath } = req.body;
      if (!sourcePath || !destPath) throw new Error('Missing source or destination path');
      const safeSource = getSafePath(sourcePath);
      const safeDest = getSafePath(destPath);
      
      if (!fs.existsSync(safeSource)) throw new Error('Source not found');
      if (fs.existsSync(safeDest)) throw new Error('Destination already exists');
      
      await logAudit('MOVE', `${sourcePath} -> ${destPath}`);
      await fs.promises.rename(safeSource, safeDest);
      broadcast(req, 'FILE_DELETED', { path: sourcePath });
      broadcast(req, 'FILE_CREATED', { path: destPath });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error moving: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Compress (Zip)
  router.post('/compress', async (req, res) => {
    try {
      const { targetPaths, destZipPath } = req.body;
      if (!targetPaths || !Array.isArray(targetPaths) || !destZipPath) throw new Error('Invalid parameters');
      const safeDest = getSafePath(destZipPath);
      const zip = new AdmZip();
      
      for (const p of targetPaths) {
        const safeP = getSafePath(p);
        if (!fs.existsSync(safeP)) throw new Error(`Target not found: ${p}`);
        if (fs.statSync(safeP).isDirectory()) {
          // Exclude heavy directories to prevent event loop blocking
          const filter = /^(?!.*(node_modules|\.git|\.ham_core|dist)).*$/;
          zip.addLocalFolder(safeP, path.basename(safeP), filter);
        } else {
          zip.addLocalFile(safeP);
        }
      }
      
      await logAudit('COMPRESS', destZipPath);
      zip.writeZip(safeDest);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error compressing: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Copy file/folder
  router.post('/copy', async (req, res) => {
    try {
      const { sourcePath, destPath } = req.body;
      if (!sourcePath || !destPath) throw new Error('Missing source or destination path');
      const safeSource = getSafePath(sourcePath);
      const safeDest = getSafePath(destPath);
      
      if (!fs.existsSync(safeSource)) throw new Error('Source not found');
      if (fs.existsSync(safeDest)) throw new Error('Destination already exists');
      
      await logAudit('COPY', `${sourcePath} -> ${destPath}`);
      
      const stat = await fs.promises.stat(safeSource);
      if (stat.isDirectory()) {
        const copyDir = async (src: string, dest: string) => {
          await fs.promises.mkdir(dest, { recursive: true });
          const entries = await fs.promises.readdir(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              await copyDir(srcPath, destPath);
            } else {
              await fs.promises.copyFile(srcPath, destPath);
            }
          }
        };
        await copyDir(safeSource, safeDest);
      } else {
        await fs.promises.copyFile(safeSource, safeDest);
      }
      
      broadcast(req, 'FILE_CREATED', { path: destPath });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error copying: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Zip List
  router.post('/zip-list', async (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath) throw new Error('Missing filePath');
      const safePath = getSafePath(filePath);
      if (!fs.existsSync(safePath)) throw new Error('File not found');
      
      const zip = new AdmZip(safePath);
      const entries = zip.getEntries().map(entry => ({
        name: entry.entryName,
        isDirectory: entry.isDirectory,
        size: entry.header.size
      }));
      
      res.json({ files: entries });
    } catch (error: any) {
      console.error(`[ERROR] Error listing zip: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Restore from Trash
  router.post('/restore', async (req, res) => {
    try {
      const { trashPath, originalName } = req.body;
      if (!trashPath || !originalName) throw new Error('Missing trashPath or originalName');
      
      const safeTrash = getSafePath(trashPath);
      const safeDest = getSafePath(originalName);
      
      if (!fs.existsSync(safeTrash)) throw new Error('Trash item not found');
      
      const destDir = path.dirname(safeDest);
      if (!fs.existsSync(destDir)) {
        await fs.promises.mkdir(destDir, { recursive: true });
      }
      
      await logAudit('RESTORE', `${trashPath} -> ${originalName}`);
      await fs.promises.rename(safeTrash, safeDest);
      
      broadcast(req, 'FILE_CREATED', { path: originalName });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error restoring: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Empty Trash
  router.post('/empty-trash', async (req, res) => {
    try {
      const trashDir = path.join(ROOT_DIR, '.trash');
      if (fs.existsSync(trashDir)) {
        const items = await fs.promises.readdir(trashDir);
        for (const item of items) {
          const fullPath = path.join(trashDir, item);
          const stat = await fs.promises.stat(fullPath);
          if (stat.isDirectory()) {
            await fs.promises.rm(fullPath, { recursive: true, force: true });
          } else {
            await fs.promises.unlink(fullPath);
          }
        }
      }
      
      await logAudit('EMPTY_TRASH', '.trash');
      broadcast(req, 'FILE_DELETED', { path: '.trash' });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error emptying trash: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Extract (Zip)
  router.post('/extract', async (req, res) => {
    try {
      const { zipPath, destDirPath } = req.body;
      if (!zipPath || !destDirPath) throw new Error('Missing zipPath or destDirPath');
      const safeZip = getSafePath(zipPath);
      const safeDest = getSafePath(destDirPath);
      if (!fs.existsSync(safeZip)) throw new Error('Zip file not found');
      
      await logAudit('EXTRACT', zipPath);
      const zip = new AdmZip(safeZip);
      
      zip.getEntries().forEach(entry => {
        const entryPath = entry.entryName;
        const targetPath = path.join(safeDest, entryPath);
        if (!targetPath.startsWith(safeDest)) {
          throw new Error(`Security Alert: Malicious zip entry detected: ${entryPath}`);
        }
      });

      zip.extractAllTo(safeDest, true);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Error extracting: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });
};
