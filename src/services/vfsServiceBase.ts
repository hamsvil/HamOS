/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { NativeStorage } from '../plugins/NativeStorage';
import { nativeBridge } from '../utils/nativeBridge';
import { vfs as virtualFS } from './vfs';
import { LoggerService } from './LoggerService';
import { structuredDb } from '../db/structuredDb';

export class VFSServiceBase {
  protected mutex: Promise<void> = Promise.resolve();
  protected listeners: ((event: 'create' | 'update' | 'delete' | 'rename', path: string, source?: string) => void)[] = [];
  protected isWriting: boolean = false;
  protected writeQueue: Promise<void> = Promise.resolve();
  
  // Zero-Lag LRU Cache
  protected fileCache: Map<string, string> = new Map();
  protected dirCache: Map<string, string[]> = new Map();
  protected readonly MAX_CACHE_SIZE = 200;

  // Add a queue for atomic operations to prevent race conditions
  protected operationQueue: Promise<unknown> = Promise.resolve();
  
  // Latency tracking
  protected lastLatency: number = 0;

  public getLastLatency(): number {
    return this.lastLatency;
  }

  protected sanitizePath(path: string): string {
    if (!path) return '/';
    path = path.replace(/\0/g, '').replace(/\\/g, '/');
    const parts = path.split('/').filter(p => p !== '');
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (resolved.length > 0) resolved.pop();
      } else {
        resolved.push(part);
      }
    }
    return '/' + resolved.join('/');
  }

  protected async ensureDir(dir: string): Promise<void> {
    if (!dir || dir === '/') return;
    const parts = dir.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      try {
        await virtualFS.mkdir(current);
      } catch (e: any) {
        LoggerService.warn('VFS', `ensureDir EEXIST or error for ${current}`, e);
      }
    }
  }

  protected updateCache(path: string, content: string) {
      if (this.fileCache.size >= this.MAX_CACHE_SIZE) {
          const firstKey = this.fileCache.keys().next().value;
          if (firstKey) this.fileCache.delete(firstKey);
      }
      this.fileCache.set(path, content);
  }

  protected invalidateCache(path: string) {
      this.fileCache.delete(path);
      // Invalidate dir cache for parent
      const parentDir = path.substring(0, path.lastIndexOf('/')) || '/';
      this.dirCache.delete(parentDir);
      this.dirCache.delete(path); // In case it's a dir
  }

  protected async indexFile(path: string, content: string) {
    try {
      const name = path.split('/').pop() || '';
      const type = name.includes('.') ? name.split('.').pop() || 'unknown' : 'file';
      const projectId = virtualFS.getCurrentProjectId();
      
      await structuredDb.fileMetadata.put({
        path,
        name,
        type,
        size: content.length,
        lastModified: Date.now(),
        projectId
      });
    } catch (e) {
      console.warn('Failed to index file in Dexie', e);
    }
  }

  protected async unindexFile(path: string) {
    try {
      const projectId = virtualFS.getCurrentProjectId();
      const file = await structuredDb.fileMetadata.where({ path, projectId }).first();
      if (file && file.id) {
        await structuredDb.fileMetadata.delete(file.id);
      }
    } catch (e) {
      console.warn('Failed to unindex file in Dexie', e);
    }
  }

  subscribe(listener: (event: 'create' | 'update' | 'delete' | 'rename', path: string, source?: string) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  protected notify(event: 'create' | 'update' | 'delete' | 'rename', path: string, source: string = 'system') {
    this.listeners.forEach(l => l(event, path, source));
  }

  // Improved lock mechanism using a strict queue with Adaptive Timeout
  protected async lock<T>(fn: () => Promise<T>, customTimeout?: number): Promise<T> {
    const start = performance.now();
    return new Promise<T>((resolve, reject) => {
        this.operationQueue = this.operationQueue.catch(() => {}).finally(async () => {
            let timeoutId: any;
            try {
                // Adaptive Timeout: Default 15s, but can be adjusted
                const timeout = customTimeout || 15000;
                const result = await Promise.race([
                    fn().then(res => { if (timeoutId) clearTimeout(timeoutId); return res; }),
                    new Promise<T>((_, r) => {
                        timeoutId = setTimeout(() => r(new Error(`VFS Lock Operation Timeout (${timeout}ms)`)), timeout);
                    })
                ]);
                this.lastLatency = performance.now() - start;
                resolve(result);
            } catch (e) {
                if (timeoutId) clearTimeout(timeoutId);
                reject(e);
            }
        });
    });
  }

  async reconcile(): Promise<void> {
    return this.lock(async () => {
      LoggerService.info('VFS', 'Starting cache reconciliation...');
      let fixedCount = 0;
      
      // Reconcile file cache
      for (const [path, cachedContent] of this.fileCache.entries()) {
        try {
          const actualContent = await virtualFS.readFile(path);
          if (actualContent !== cachedContent) {
            this.fileCache.set(path, actualContent);
            fixedCount++;
          }
        } catch (e) {
          // File might have been deleted outside this service
          this.fileCache.delete(path);
          fixedCount++;
        }
      }
      
      // Clear dir cache as it's harder to reconcile without full scan
      this.dirCache.clear();
      
      LoggerService.info('VFS', `Reconciliation complete. Fixed ${fixedCount} entries.`);
    });
  }

  async initialize(): Promise<void> {
    return this.lock(async () => {
      // Ensure root exists and basic structure is ready
      try {
        // Use a timeout for VFS initialization to prevent hanging the whole app
        let timeoutId: any;
        await Promise.race([
            virtualFS.mkdir('/').then(res => { if (timeoutId) clearTimeout(timeoutId); return res; }),
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('VFS Initialization Timeout')), 10000);
            })
        ]);
      } catch (e) {
        LoggerService.info('VFS', 'Root directory check during initialization', e);
      }
    });
  }

  async readdir(rawPath: string): Promise<string[]> {
    const path = this.sanitizePath(rawPath);
    if (this.dirCache.has(path)) {
        return this.dirCache.get(path)!;
    }
    return this.lock(async () => {
      const result = await virtualFS.listDir(path);
      if (this.dirCache.size >= this.MAX_CACHE_SIZE) {
          const firstKey = this.dirCache.keys().next().value;
          if (firstKey) this.dirCache.delete(firstKey);
      }
      this.dirCache.set(path, result);
      return result;
    });
  }

  async waitForWrites(): Promise<void> {
    await this.writeQueue;
    await this.mutex;
  }

  async writeFile(rawPath: string, content: string, source: string = 'system'): Promise<void> {
    const path = this.sanitizePath(rawPath);
    this.isWriting = true;
    const writeOp = this.lock(async () => {
      // Ensure parent directories exist
      const lastSlash = path.lastIndexOf('/');
      if (lastSlash > 0) {
        const dir = path.substring(0, lastSlash);
        await this.ensureDir(dir);
      }

      // Atomic Write Protocol: Write to .tmp first, then rename
      const tempPath = `${path}.tmp_${Date.now()}`;
      try {
        await virtualFS.writeFile(tempPath, content);
        
        // Verify content integrity (basic check)
        const written = await virtualFS.readFile(tempPath);
        if (written.length !== content.length) {
            throw new Error("Atomic Write Failed: Content length mismatch");
        }

        // Rename to final path (Atomic operation)
        await virtualFS.rename(tempPath, path);
        this.updateCache(path, content);
        this.invalidateCache(path); // Clear dir cache
        this.indexFile(path, content); // Index in Dexie
        
        // Sync to Native Storage
        if (nativeBridge.isAvailable()) {
            try {
                const projectId = virtualFS.getCurrentProjectId();
                const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
                await NativeStorage.writeFile({ path: nativePath, data: content });
            } catch (nativeErr) {
                LoggerService.error('VFS', `Native sync error on writeFile for ${path}`, nativeErr);
            }
        }
      } catch (e) {
        // Cleanup temp file on failure
        try { await virtualFS.unlink(tempPath); } catch (cleanupErr) {
            LoggerService.error('VFS', `Failed to cleanup temp file ${tempPath}`, cleanupErr);
        }
        throw e;
      }
      
      this.notify('update', path, source);
    });
    
    writeOp.finally(() => {
        this.isWriting = false;
    });
    
    this.writeQueue = writeOp.catch(() => {});
    return writeOp;
  }

  async readFile(rawPath: string): Promise<string> {
    const path = this.sanitizePath(rawPath);
    if (this.fileCache.has(path)) {
        return this.fileCache.get(path)!;
    }
    return this.lock(async () => {
      const content = await virtualFS.readFile(path);
      this.updateCache(path, content);
      return content;
    });
  }

  async readFileAsBuffer(rawPath: string): Promise<Uint8Array> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      return await virtualFS.readFileAsBuffer(path);
    });
  }

  async deleteFile(rawPath: string): Promise<void> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      // virtualFS.unlink handles both files and directories recursively
      await virtualFS.unlink(path);
      this.invalidateCache(path);
      this.unindexFile(path); // Remove from Dexie
      this.notify('delete', path);
      
      if (nativeBridge.isAvailable()) {
          try {
              const projectId = virtualFS.getCurrentProjectId();
              const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
              await NativeStorage.deleteFile({ path: nativePath });
          } catch (nativeErr) {
              LoggerService.error('VFS', `Native sync error on deleteFile for ${path}`, nativeErr);
          }
      }
    });
  }

  async renameFile(rawOldPath: string, rawNewPath: string): Promise<void> {
    const oldPath = this.sanitizePath(rawOldPath);
    const newPath = this.sanitizePath(rawNewPath);
    return this.lock(async () => {
      await virtualFS.rename(oldPath, newPath);
      this.invalidateCache(oldPath);
      this.invalidateCache(newPath);
      
      // Update Dexie index
      try {
        const content = await virtualFS.readFile(newPath);
        await this.unindexFile(oldPath);
        await this.indexFile(newPath, content);
      } catch (e) {
        // It might be a directory, skip content reading
      }

      this.notify('rename', oldPath, newPath);
      
      if (nativeBridge.isAvailable()) {
          try {
              const projectId = virtualFS.getCurrentProjectId();
              const nativeOldPath = `projects/${projectId}${oldPath.startsWith('/') ? oldPath : '/' + oldPath}`;
              const nativeNewPath = `projects/${projectId}${newPath.startsWith('/') ? newPath : '/' + newPath}`;
              await NativeStorage.rename({ oldPath: nativeOldPath, newPath: nativeNewPath });
          } catch (nativeErr) {
              LoggerService.error('VFS', `Native sync error on renameFile from ${oldPath} to ${newPath}`, nativeErr);
          }
      }
    });
  }

  async exists(rawPath: string): Promise<boolean> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      try {
        await virtualFS.readFile(path);
        return true;
      } catch (e) {
        return false;
      }
    });
  }

  async mkdir(rawPath: string): Promise<void> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      await virtualFS.mkdir(path);
      this.notify('create', path);
      
      if (nativeBridge.isAvailable()) {
          try {
              const projectId = virtualFS.getCurrentProjectId();
              const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
              await NativeStorage.mkdir({ path: nativePath });
          } catch (nativeErr) {
              LoggerService.error('VFS', `Native sync error on mkdir for ${path}`, nativeErr);
          }
      }
    });
  }

  async unlink(rawPath: string): Promise<void> {
    const path = this.sanitizePath(rawPath);
    return this.deleteFile(path);
  }
}
