/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { spawn } from 'child_process';
import { 
  getSafePath, 
  logAudit, 
  getMetadata, 
  saveMetadata, 
  broadcast,
  readChunk
} from './privateSourceService';

const ROOT_DIR = process.cwd();

// Upload configuration
const upload = multer({ 
  dest: path.join(ROOT_DIR, '.tmp_uploads'),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit for chunked
});

export const setupFileOpsRoutes = (router: express.Router) => {
  // Chunked Upload
  router.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
    try {
      const { chunkIndex, totalChunks, fileName, destPath, uploadId } = req.body;
      const file = (req as any).file;
      if (!file) throw new Error('No chunk uploaded');
      
      const tempDir = path.join(ROOT_DIR, '.tmp_uploads', uploadId);
      if (!fs.existsSync(tempDir)) await fs.promises.mkdir(tempDir, { recursive: true });
      
      const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);
      await fs.promises.rename(file.path, chunkPath);
      
      const uploadedChunks = await fs.promises.readdir(tempDir);
      if (uploadedChunks.length === parseInt(totalChunks)) {
        const safeDestDir = getSafePath(destPath);
        if (!fs.existsSync(safeDestDir)) await fs.promises.mkdir(safeDestDir, { recursive: true });
        const finalPath = path.join(safeDestDir, fileName);
        
        const writeStream = fs.createWriteStream(finalPath);
        
        for (let i = 0; i < parseInt(totalChunks); i++) {
          const p = path.join(tempDir, `chunk-${i}`);
          const readStream = fs.createReadStream(p);
          
          await new Promise<void>((resolve, reject) => {
            readStream.pipe(writeStream, { end: false });
            readStream.on('end', () => resolve());
            readStream.on('error', reject);
          });
          
          await fs.promises.unlink(p);
        }
        
        writeStream.end();
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        await logAudit('UPLOAD_CHUNKED', `${destPath}/${fileName}`);
        broadcast(req, 'FILE_CREATED', { path: `${destPath}/${fileName}` });
        return res.json({ success: true, completed: true });
      }
      
      res.json({ success: true, completed: false });
    } catch (error: any) {
      console.error(`[ERROR] Chunked upload error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      const { destPath } = req.body;
      if (!destPath) throw new Error('Missing destPath');
      const safeDestDir = getSafePath(destPath);
      
      if (!fs.existsSync(safeDestDir) || !fs.statSync(safeDestDir).isDirectory()) {
        throw new Error('Invalid destination directory');
      }
      
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      await logAudit('UPLOAD', `${destPath}/${file.originalname}`);
      const safeDest = path.join(safeDestDir, file.originalname);
      
      await fs.promises.rename(file.path, safeDest);
      broadcast(req, 'FILE_CREATED', { path: `${destPath}/${file.originalname}` });
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[ERROR] Upload error: ${error.message}`);
      if ((req as any).file) {
        try { fs.unlinkSync((req as any).file.path); } catch (e) {}
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Read chunk
  router.post('/read-chunk', async (req, res) => {
    try {
      const { filePath, start, end } = req.body;
      if (!filePath || start === undefined || end === undefined) throw new Error('Missing parameters');
      const safePath = getSafePath(filePath);
      if (!fs.existsSync(safePath)) throw new Error('File not found');
      
      const chunk = await readChunk(safePath, start, end);
      res.json({ chunk });
    } catch (error: any) {
      console.error(`[ERROR] Read chunk error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Download
  router.get('/download', async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) return res.status(400).send('Missing path');
      const safePath = getSafePath(filePath);
      
      if (!fs.existsSync(safePath)) {
        return res.status(404).send('File not found');
      }
      
      const stats = fs.statSync(safePath);
      if (stats.isDirectory()) return res.status(400).send('Cannot download a directory');
      if (stats.size > 500 * 1024 * 1024) return res.status(400).send('File too large (max 500MB)');
      
      await logAudit('DOWNLOAD', filePath);

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(safePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'application/octet-stream',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        res.download(safePath, path.basename(safePath), (err) => {
          if (err) console.error(`[ERROR] Download error: ${err.message}`);
        });
      }
    } catch (error: any) {
      console.error(`[ERROR] Download error: ${error.message}`);
      res.status(500).send(error.message);
    }
  });

  // Search content
  router.post('/search', async (req, res) => {
    try {
      const { query, mode = 'name' } = req.body;
      if (!query || typeof query !== 'string') throw new Error('Invalid query');
      
      if (mode === 'name') {
        const findFiles = async (dir: string): Promise<string[]> => {
          const results: string[] = [];
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          
          await Promise.all(entries.map(async (entry) => {
            const resPath = path.resolve(dir, entry.name);
            if (entry.isDirectory()) {
              // Skip heavy directories
              if (['node_modules', '.git', '.ham_core', 'dist', '.trash', '.tmp_uploads'].includes(entry.name)) return;
              const subFiles = await findFiles(resPath);
              results.push(...subFiles);
            } else if (entry.name.toLowerCase().includes(query.toLowerCase())) {
              results.push(path.relative(ROOT_DIR, resPath).replace(/\\/g, '/'));
            }
          }));
          
          return results;
        };
        const matches = await findFiles(ROOT_DIR);
        return res.json({ files: matches });
      }

      // Optimized grep with better exclusions and limit
      const grep = spawn('grep', [
        '-rnI', 
        '--max-count=1', 
        '--exclude-dir={.git,node_modules,dist,.tmp_uploads,.trash,.ham_core}', 
        query, 
        '.'
      ], { cwd: ROOT_DIR });
      
      let stdout = '';
      grep.stdout.on('data', (data) => {
        if (stdout.length < 1024 * 1024) { // Limit result size to 1MB
          stdout += data.toString();
        }
      });

      grep.on('close', (code) => {
        const results = stdout.split('\n').filter(Boolean).map(line => {
          const match = line.match(/^([^:]+):(\d+):(.*)$/);
          if (match) {
            const file = match[1].replace(/^\.\//, '').replace(/\\/g, '/');
            return { file, line: match[2], snippet: match[3].trim().substring(0, 150) };
          }
          return null;
        }).filter(Boolean);
        
        const uniqueFiles = new Map();
        results.forEach(r => {
          if (r && !uniqueFiles.has(r.file)) {
            uniqueFiles.set(r.file, r);
          }
        });
        
        res.json({ 
          files: Array.from(uniqueFiles.keys()), 
          snippets: Array.from(uniqueFiles.values()) 
        });
      });

      grep.on('error', (err) => {
        console.error('[GREP ERROR]', err);
        res.status(500).json({ error: 'Search failed' });
      });
    } catch (error: any) {
      console.error(`[ERROR] Error searching: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/file-metadata', async (req, res) => {
    try {
      const { path: filePath } = req.query;
      if (!filePath) throw new Error('Missing path');
      const fileMeta = await getMetadata(filePath as string);
      res.json(fileMeta);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/add-comment', async (req, res) => {
    try {
      const { filePath, text } = req.body;
      const metadata = await getMetadata(filePath) as any;
      
      const comment = {
        id: Math.random().toString(36).substring(7),
        text,
        date: new Date().toLocaleString(),
        user: 'Admin'
      };
      
      metadata.comments.unshift(comment);
      metadata.activities.unshift({
        id: Math.random().toString(36).substring(7),
        action: 'Commented',
        user: 'Admin',
        date: new Date().toLocaleString(),
        details: text
      });
      
      await saveMetadata(filePath, metadata);
      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
};
