/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { SecretManager } from '../core/SecretManager';

const ROOT_DIR = process.cwd();
// SECURITY: Resolved via SecretManager — cryptographically random values generated
// on first run and persisted in .hamli-secrets.json, or overridden by env vars.
// No hardcoded fallback values exist.
const ACCESS_PASSWORD = SecretManager.PRIVATE_SOURCE_PASSWORD;
const JWT_SECRET = SecretManager.JWT_SECRET;
const METADATA_FILE = path.join(ROOT_DIR, 'private_source_metadata.json');

export const getSafePath = (unsafePath: string) => {
  if (!unsafePath) return ROOT_DIR;
  const resolvedPath = path.resolve(ROOT_DIR, unsafePath.replace(/^[\\\/]+/, ''));
  if (!resolvedPath.startsWith(ROOT_DIR)) {
    throw new Error('Access denied: Path outside root directory');
  }
  return resolvedPath;
};

export const broadcast = (req: any, event: string, data: any) => {
  const wss = (req.app.get('server') as any)?.wss;
  if (wss) {
    const payload = JSON.stringify({ type: 'FS_EVENT', event, data });
    wss.clients.forEach((client: any) => {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    });
  }
};

export const logAudit = async (action: string, targetPath: string, user: string = 'admin') => {
  const timestamp = new Date().toISOString();
  const logEntry = `[AUDIT] ${timestamp} - Action: ${action}, Path: ${targetPath}, User: ${user}\n`;
  console.log(logEntry.trim());
  try {
    const logFilePath = path.join(ROOT_DIR, 'private_source_audit.log');
    // Simple log rotation: if log file > 1MB, rename it
    if (fs.existsSync(logFilePath)) {
      const stats = await fs.promises.stat(logFilePath);
      if (stats.size > 1024 * 1024) {
        await fs.promises.rename(logFilePath, `${logFilePath}.${Date.now()}.bak`);
      }
    }
    await fs.promises.appendFile(logFilePath, logEntry);
  } catch (e) {
    console.error('Failed to write audit log');
  }
};

export const readChunk = async (filePath: string, start: number, end: number): Promise<string> => {
  const fd = await fs.promises.open(filePath, 'r');
  const buffer = Buffer.alloc(end - start);
  await fd.read(buffer, 0, end - start, start);
  await fd.close();
  return buffer.toString('utf-8');
};

export const getDirSize = async (dir: string): Promise<number> => {
  let size = 0;
  try {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      if (file.name === 'node_modules' || file.name === '.git' || file.name === '.ham_core' || file.name === 'dist') {
        continue; // Skip heavy directories
      }
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        size += await getDirSize(fullPath);
      } else {
        const stats = await fs.promises.stat(fullPath);
        size += stats.size;
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return size;
};

export const getMetadata = async (filePath: string): Promise<unknown> => {
  try {
    if (!fs.existsSync(METADATA_FILE)) return { versions: [], comments: [], activities: [] };
    const data = JSON.parse(await fs.promises.readFile(METADATA_FILE, 'utf-8'));
    return data[filePath] || { versions: [], comments: [], activities: [] };
  } catch (e) {
    return { versions: [], comments: [], activities: [] };
  }
};

export const saveMetadata = async (filePath: string, fileData: any) => {
  try {
    let data: any = {};
    if (fs.existsSync(METADATA_FILE)) {
      data = JSON.parse(await fs.promises.readFile(METADATA_FILE, 'utf-8'));
    }
    data[filePath] = fileData;
    await fs.promises.writeFile(METADATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save metadata', e);
  }
};

export const verifyToken = (token: string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
};

export const generateToken = (payload: any) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const checkPassword = (password: string) => {
  return password === ACCESS_PASSWORD;
};

export const cleanupTask = async () => {
  try {
    const trashPath = path.join(ROOT_DIR, '.trash');
    const tmpUploadsPath = path.join(ROOT_DIR, '.tmp_uploads');
    const now = Date.now();
    const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days for trash
    const MAX_TMP_AGE = 24 * 60 * 60 * 1000; // 24 hours for tmp

    if (fs.existsSync(trashPath)) {
      const files = await fs.promises.readdir(trashPath);
      for (const file of files) {
        const filePath = path.join(trashPath, file);
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > MAX_AGE) {
          await fs.promises.rm(filePath, { recursive: true, force: true });
          console.log(`[TRASH] Auto-cleaned: ${file}`);
        }
      }
    }

    if (fs.existsSync(tmpUploadsPath)) {
      const dirs = await fs.promises.readdir(tmpUploadsPath);
      for (const dir of dirs) {
        const dirPath = path.join(tmpUploadsPath, dir);
        const stats = await fs.promises.stat(dirPath);
        if (now - stats.mtimeMs > MAX_TMP_AGE) {
          await fs.promises.rm(dirPath, { recursive: true, force: true });
          console.log(`[TMP] Auto-cleaned stale upload: ${dir}`);
        }
      }
    }
  } catch (e) {
    console.error('[CLEANUP] Task failed:', e);
  }
};
