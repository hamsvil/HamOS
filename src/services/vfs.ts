/* eslint-disable no-useless-assignment */
import { fs, vol } from 'memfs';
import * as vfsGit from './vfsGit';
import { get as idbGet, set as idbSet } from 'idb-keyval';

// Safe IDB wrappers for non-browser environments
const get = async (key: string) => {
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    return idbGet(key);
  }
  return null;
};

const set = async (key: string, val: any) => {
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    try {
      // Deep sanitize to remove non-cloneable symbols (like React forward refs)
      const sanitized = JSON.parse(JSON.stringify(val, (k, v) => {
        if (typeof v === 'symbol' || (v && typeof v === 'object' && v.$$typeof)) return undefined;
        return v;
      }));
      return idbSet(key, sanitized);
    } catch (e) {
      console.error('[VFS] IDB Set Sanitization Failed:', e);
      return idbSet(key, val); // Fallback to original
    }
  }
};

// Mutex Lock for Concurrency
class Mutex {
  private mutex = Promise.resolve();

  lock(): Promise<() => void> {
    let begin: (unlock: () => void) => void;
    this.mutex = this.mutex.then(() => {
      return new Promise(begin);
    });
    return new Promise((res) => {
      begin = res;
    });
  }
}

// Type Safety Enforcement Interface
interface MemFS {
  existsSync: (p: string) => boolean;
  mkdirSync: (p: string, options?: any) => void;
  writeFileSync: (p: string, data: string) => void;
  writeFile: (p: string, d: string, cb: (err: any) => void) => void;
  readFile: (p: string, enc: string, cb: (err: any, d: string) => void) => void;
  mkdir: (p: string, opts: any, cb: (err: any) => void) => void;
  unlink: (p: string, cb: (err: any) => void) => void;
  rmdir: (p: string, opts: any, cb: (err: any) => void) => void;
  readdir: (p: string, cb: (err: any, files: string[]) => void) => void;
  readdirSync: (p: string) => string[];
  stat: (p: string, cb: (err: any, stats: any) => void) => void;
  statSync: (p: string) => { isDirectory: () => boolean; size: number };
  rename: (o: string, n: string, cb: (err: any) => void) => void;
}

// Initialize Virtual File System
export class VirtualFileSystem {
  private static instance: VirtualFileSystem;
  private fs: MemFS;
  private initialized: boolean = false;
  private currentProjectId: string = 'default';
  private lastModified: Map<string, number> = new Map();
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private vfsMutex = new Mutex();
  private snapshots: Map<string, Record<string, string | null>> = new Map();

  private initPromise: Promise<void>;

  private constructor() {
    this.fs = fs as unknown as MemFS;
    // Initialize root if needed
    if (!this.fs.existsSync('/')) {
      this.fs.mkdirSync('/');
    }
    this.initPromise = this.initOPFS().then(() => this.loadFromStorage());

    // Data Loss Prevention: Flush on unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushSync();
      });
    }
  }

  public async ensureInitialized() {
    await this.initPromise;
  }

  public createSnapshot(snapshotId: string) {
    this.snapshots.set(snapshotId, vol.toJSON());
  }

  public rollbackToSnapshot(snapshotId: string) {
    const snapshot = this.snapshots.get(snapshotId);
    if (snapshot) {
      vol.reset();
      vol.fromJSON(snapshot);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const unlock = await this.vfsMutex.lock();
    try {
      return await operation();
    } finally {
      unlock();
    }
  }

  private async initOPFS() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
      try {
        // Add a strict timeout for OPFS initialization to prevent hanging
        let timeoutId: any;
        this.opfsRoot = await Promise.race([
          navigator.storage.getDirectory().then(res => { if (timeoutId) clearTimeout(timeoutId); return res; }),
          new Promise<FileSystemDirectoryHandle>((_, reject) => {
              timeoutId = setTimeout(() => reject(new Error('OPFS Initialization Timeout')), 30000);
          })
        ]);
        // console.log('[VFS] OPFS initialized');
      } catch (e) {
        console.warn('[VFS] Failed to initialize OPFS or timed out:', e);
      }
    }
  }

  public static getInstance(): VirtualFileSystem {
    if (!VirtualFileSystem.instance) {
      VirtualFileSystem.instance = new VirtualFileSystem();
    }
    return VirtualFileSystem.instance;
  }

  public setProjectId(projectId: string) {
    if (this.currentProjectId === projectId) return;
    
    // Flush current project before switching
    this.flushSync();
    
    this.currentProjectId = projectId;
    this.initialized = false;
    this.lastModified.clear();
    vol.reset();
    if (!this.fs.existsSync('/')) {
      this.fs.mkdirSync('/');
    }
    this.loadFromStorage();
  }

  public getCurrentProjectId(): string {
    return this.currentProjectId;
  }

  private getStorageKey() {
    return `ham_vfs_${this.currentProjectId}`;
  }

  private async loadFromStorage() {
    if (this.initialized) return;
    
    try {
      // Try OPFS first (Phase 2)
      if (this.opfsRoot) {
        try {
          const projectDir = await this.opfsRoot.getDirectoryHandle(this.getStorageKey(), { create: true });
          let timeoutId: any;
          const snapshot = await Promise.race([
            this.readDirFromOPFS(projectDir).then(res => { if (timeoutId) clearTimeout(timeoutId); return res; }),
            new Promise<Record<string, string>>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('OPFS Load Timeout')), 30000);
            })
          ]);
          if (Object.keys(snapshot).length > 0) {
            vol.fromJSON(snapshot);
            this.initialized = true;
            return;
          }
        } catch (e) {
          console.warn('[VFS] OPFS load failed, falling back to IDB', e);
        }
      }

      // Fallback to IDB
      const snapshot = await get(this.getStorageKey());
      if (snapshot) {
        vol.fromJSON(snapshot);
      }
    } catch (e: any) {
      const err = e as Error;
      console.error('[VFS] Load error:', err);
      // Fallback to IDB if OPFS fails or times out
      try {
        const snapshot = await get(this.getStorageKey());
        if (snapshot) {
          vol.fromJSON(snapshot);
        }
      } catch (idbErr) {
        console.error('[VFS] IDB Fallback Load error:', idbErr);
      }
    } finally {
      this.initialized = true;
    }
  }

  private async readDirFromOPFS(dirHandle: FileSystemDirectoryHandle, path = ''): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for await (const [name, handle] of dirHandle.entries()) {
      const fullPath = path ? `${path}/${name}` : name;
      if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile();
        const content = await file.text();
        result[fullPath] = content;
      } else {
        const subDir = await dirHandle.getDirectoryHandle(name);
        const subResult = await this.readDirFromOPFS(subDir, fullPath);
        Object.assign(result, subResult);
      }
    }
    return result;
  }

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  private async saveToStorage() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    
    this.saveTimeout = setTimeout(async () => {
        try {
          const snapshot = vol.toJSON();
          
          // Save to OPFS (Phase 2)
          if (this.opfsRoot) {
            const projectDir = await this.opfsRoot.getDirectoryHandle(this.getStorageKey(), { create: true });
            await Promise.race([
              this.writeToOPFS(projectDir, snapshot),
              new Promise((_, reject) => setTimeout(() => reject(new Error('OPFS Save Timeout')), 30000))
            ]);
          }

          // Fallback/Mirror to IDB
          await set(this.getStorageKey(), snapshot);
        } catch (e) {
          console.error('[VFS] Save error:', e);
        }
    }, 1000);
  }

  private async writeToOPFS(dirHandle: FileSystemDirectoryHandle, snapshot: Record<string, string | null>) {
    for (const [path, content] of Object.entries(snapshot)) {
      if (content === null) continue;
      const parts = path.split('/').filter(Boolean);
      let currentDir = dirHandle;
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
      }
      
      const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    }
  }

  // Synchronous flush for beforeunload event
  public flushSync() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    try {
      const snapshot = vol.toJSON();
      // Using set from idb-keyval is async, but in beforeunload we do our best.
      // Modern browsers support keep-alive promises or we just fire it.
      set(this.getStorageKey(), snapshot).catch(() => {});
    } catch (e) {
      console.error("Failed to flush VFS", e);
    }
  }

  public getFS() {
    return this.fs;
  }

  public async bulkWrite(files: { path: string; content: string }[]) {
    return this.withLock(async () => {
      const tempFiles: { original: string, temp: string }[] = [];
      try {
        for (const file of files) {
           const dir = file.path.substring(0, file.path.lastIndexOf('/'));
           if (dir && !this.fs.existsSync(dir)) {
               this.fs.mkdirSync(dir, { recursive: true });
           }
           const tempPath = `${file.path}.tmp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
           this.fs.writeFileSync(tempPath, file.content);
           tempFiles.push({ original: file.path, temp: tempPath });
        }

        for (const item of tempFiles) {
            const written = (this.fs as any).readFileSync(item.temp, 'utf8') as string;
            const originalFile = files.find(f => f.path === item.original);
            if (originalFile && written.length !== originalFile.content.length) {
                throw new Error(`Atomic Bulk Write Failed: Integrity check failed for ${item.original}`);
            }
            try {
                (this.fs as any).renameSync(item.temp, item.original);
            } catch (err) {
                console.error(`Failed to rename temp file ${item.temp} to ${item.original}`, err);
            }
            this.lastModified.set(item.original, Date.now());
        }

        this.saveToStorage();
      } catch (e) {
        for (const item of tempFiles) {
            try { this.fs.unlink(item.temp, () => {}); } catch (err) {}
        }
        throw e;
      }
    });
  }

  public async writeFile(path: string, content: string) {
    await this.ensureInitialized();
    return this.withLock(async () => {
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir && !this.fs.existsSync(dir)) {
          this.fs.mkdirSync(dir, { recursive: true });
      }
      return new Promise<void>((resolve, reject) => {
        this.fs.writeFile(path, content, (err: any) => {
          if (err) reject(err);
          else {
            this.lastModified.set(path, Date.now());
            this.saveToStorage(); // Persist on write
            resolve();
          }
        });
      });
    });
  }

  public async readFile(path: string): Promise<string> {
    await this.ensureInitialized();
    return new Promise<string>((resolve, reject) => {
      this.fs.readFile(path, 'utf8', (err: any, data: string) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  public async exists(path: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.fs.existsSync(path);
  }

  public async readFileAsBuffer(path: string): Promise<Uint8Array> {
    await this.ensureInitialized();
    return new Promise<Uint8Array>((resolve, reject) => {
      (this.fs as any).readFile(path, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(new Uint8Array(data));
      });
    });
  }

  public async mkdir(path: string) {
    await this.ensureInitialized();
    return this.withLock(async () => {
      return new Promise<void>((resolve, reject) => {
        this.fs.mkdir(path, { recursive: true }, (err: any) => {
          if (err) reject(err);
          else {
            this.saveToStorage();
            resolve();
          }
        });
      });
    });
  }

  public async unlink(path: string) {
    await this.ensureInitialized();
    return this.withLock(async () => {
      return new Promise<void>((resolve, reject) => {
        try {
          const stat = this.fs.statSync(path);
          if (stat && stat.isDirectory()) {
            this.fs.rmdir(path, { recursive: true }, (err: any) => {
              if (err) reject(err);
              else {
                this.lastModified.delete(path);
                this.saveToStorage();
                resolve();
              }
            });
          } else {
            this.fs.unlink(path, (err: any) => {
              if (err) reject(err);
              else {
                this.lastModified.delete(path);
                this.saveToStorage();
                resolve();
              }
            });
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  public async listDir(path: string): Promise<string[]> {
    await this.ensureInitialized();
    return new Promise<string[]>((resolve, reject) => {
      this.fs.readdir(path, (err: any, files: string[]) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  }

  public getLastModified(path: string): number {
    return this.lastModified.get(path) || 0;
  }

  public async stat(path: string): Promise<unknown> {
    if (!this.initialized) await this.loadFromStorage();
    return new Promise<unknown>((resolve, reject) => {
      this.fs.stat(path, (err: any, stats: any) => {
        if (err) reject(err);
        else resolve(stats);
      });
    });
  }

  public async rename(oldPath: string, newPath: string) {
    return this.withLock(async () => {
      return new Promise<void>((resolve, reject) => {
        this.fs.rename(oldPath, newPath, (err: any) => {
          if (err) reject(err);
          else {
            this.lastModified.delete(oldPath);
            this.lastModified.set(newPath, Date.now());
            this.saveToStorage();
            resolve();
          }
        });
      });
    });
  }

  // Git Operations
  public async gitClone(url: string, dir: string) {
    return vfsGit.gitClone(this.fs, url, dir, () => this.saveToStorage());
  }

  public async gitStatus(dir: string) {
    return vfsGit.gitStatus(this.fs, dir);
  }

  public async gitCommit(dir: string, message: string, author: { name: string, email: string }) {
    return vfsGit.gitCommit(this.fs, dir, message, author, (d) => this.listDirRecursive(d), () => this.saveToStorage());
  }

  public async gitReadObject(dir: string, filepath: string) {
    return vfsGit.gitReadObject(this.fs, dir, filepath);
  }

  public async gitPush(dir: string, url: string, token: string) {
    return vfsGit.gitPush(this.fs, dir, url, token);
  }

  public async gitPull(dir: string, url: string, token: string) {
    return vfsGit.gitPull(this.fs, dir, url, token);
  }

  private async listDirRecursive(dir: string): Promise<string[]> {
    return vfsGit.listDirRecursive(this.fs, dir, (d) => this.listDir(d));
  }
}

export const vfs = VirtualFileSystem.getInstance();
