/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { NativeStorage } from '../plugins/NativeStorage';
import { nativeBridge } from '../utils/nativeBridge';
import { vfs as virtualFS } from './vfs';
import { universalFs } from './universalFsBridge';
import { LoggerService } from './LoggerService';
import { safeStorage } from '../utils/storage';
import { structuredDb } from '../db/structuredDb';
import { vfsExtraService } from './vfsExtraService';
import { resilienceEngine } from './ResilienceEngine';
import { Mutex, withTimeout, MutexInterface } from 'async-mutex';

class VFSService {
  private mutex: Promise<void> = Promise.resolve();
  private listeners: ((event: 'create' | 'update' | 'delete' | 'rename', path: string, source?: string) => void)[] = [];
  private isWriting: boolean = false;
  private writeQueue: Promise<void> = Promise.resolve();
  
  // Zero-Lag LRU Cache
  private fileCache: Map<string, string> = new Map();
  private dirCache: Map<string, string[]> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;

  // Add a queue for atomic operations to prevent race conditions
  private pathMutexes: Map<string, MutexInterface> = new Map();
  private lastLatency: number = 0;

  private sanitizePath(path: string): string {
    if (!path) return '/';
    // Deep sanitize: remove null bytes, control characters, and normalize slashes
    path = path.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/\\/g, '/');
    
    const parts = path.split('/').filter(p => p !== '' && p !== '.');
    const resolved: string[] = [];
    
    for (const part of parts) {
      if (part === '..') {
        if (resolved.length > 0) resolved.pop();
      } else {
        // Prevent extremely long filenames or invalid characters for some filesystems
        const safePart = part.substring(0, 255).replace(/[<>:"|?*]/g, '');
        if (safePart) resolved.push(safePart);
      }
    }
    return '/' + resolved.join('/');
  }

  private async ensureDir(dir: string): Promise<void> {
    if (!dir || dir === '/') return;
    const parts = dir.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      try {
        await universalFs.mkdir(current);
      } catch (e: unknown) {
        const err = e as Error;
        LoggerService.warn('VFS', `ensureDir EEXIST or error for ${current}`, err);
      }
    }
  }

  private updateCache(path: string, content: string) {
      if (this.fileCache.size >= this.MAX_CACHE_SIZE) {
          const firstKey = this.fileCache.keys().next().value;
          if (firstKey) this.fileCache.delete(firstKey);
      }
      this.fileCache.set(path, content);
  }

  private invalidateCache(path: string) {
      this.fileCache.delete(path);
      // Invalidate dir cache for parent
      const parentDir = path.substring(0, path.lastIndexOf('/')) || '/';
      this.dirCache.delete(parentDir);
      this.dirCache.delete(path); // In case it's a dir
  }

  private async indexFile(path: string, content: string) {
    const name = path.split('/').pop() || '';
    const type = name.includes('.') ? name.split('.').pop() || 'unknown' : 'file';
    const projectId = virtualFS.getCurrentProjectId();
    
    try {
      await structuredDb.fileMetadata.put({
        path,
        name,
        type,
        size: content.length,
        lastModified: Date.now(),
        projectId
      });
    } catch (e: unknown) {
      const err = e as Error;
      if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
        // console.error('Dexie Quota Exceeded. Attempting to clear old metadata...');
        try {
          // Clear metadata older than 30 days as a simple cleanup strategy
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          await structuredDb.fileMetadata.where('lastModified').below(thirtyDaysAgo).delete();
          // Retry once
          await structuredDb.fileMetadata.put({
            path, name, type, size: content.length, lastModified: Date.now(), projectId
          });
        } catch (retryError) {
          // console.error('Cleanup failed or quota still exceeded', retryError);
        }
      } else {
        // console.warn('Failed to index file in Dexie', e);
      }
    }
  }

  private async unindexFile(path: string) {
    try {
      const projectId = virtualFS.getCurrentProjectId();
      const file = await structuredDb.fileMetadata.where({ path, projectId }).first();
      if (file && file.id) {
        await structuredDb.fileMetadata.delete(file.id);
      }
    } catch (e) {
      // console.warn('Failed to unindex file in Dexie', e);
    }
  }

  subscribe(listener: (event: 'create' | 'update' | 'delete' | 'rename', path: string, source?: string) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(event: 'create' | 'update' | 'delete' | 'rename', path: string, source: string = 'system') {
    this.listeners.forEach(l => l(event, path, source));
  }

  // Circuit breaker state
  private consecutiveFailures: number = 0;
  private circuitOpenUntil: number = 0;
  private readonly FAILURE_THRESHOLD = 10;
  private readonly CIRCUIT_OPEN_DURATION = 15000;
  private nativeSyncQueue: Promise<void> = Promise.resolve();
  private lastOperationLatencies: number[] = [];
  private readonly LATENCY_SAMPLE_SIZE = 5;
  private heldLocks = new Set<string>();
  private lockWatchdogInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
    this.startLockWatchdog();
  }

  private startLockWatchdog() {
    if (this.lockWatchdogInterval) clearInterval(this.lockWatchdogInterval);
    this.lockWatchdogInterval = setInterval(async () => {
      // [ARCHITECT HEAL] Heartbeat check to detect Frozen VFS Bridge
      if (this.isWriting || Date.now() < this.circuitOpenUntil) return;
      
      try {
        const start = performance.now();
        await Promise.race([
          universalFs.exists('/'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('VFS Heartbeat Timeout')), 5000))
        ]);
        const latency = performance.now() - start;
        if (latency > 2000) {
           console.warn(`[VFS-HEAL] High latency detected: ${Math.round(latency)}ms`);
        }
      } catch (e) {
        console.error('[VFS-HEAL] VFS Heartbeat Failed. Bridge may be frozen.', e);
        // Force re-initialization if heartbeat fails twice
        this.consecutiveFailures++;
        if (this.consecutiveFailures > 3) {
           console.info('[VFS-HEAL] Triggering VFS Soft Reset...');
           this.fileCache.clear();
           this.dirCache.clear();
           this.initialize().catch(() => {});
        }
      }
    }, 30000); // Check every 30s
  }

  // Improved lock mechanism using async-mutex
  // [ARCHITECT FIX] Downscaled timeout to 15s and maxRetries to 1 to fail-fast and avoid Deadlocks
  private async lock<T>(fn: () => Promise<T>, name: string = 'unknown', customTimeout: number = 15000, maxRetries: number = 1, lockKey: string = 'global'): Promise<T> {
    if (Date.now() < this.circuitOpenUntil) {
      const remaining = Math.ceil((this.circuitOpenUntil - Date.now()) / 1000);
      throw new Error(`VFS Circuit Breaker is OPEN. System cooling down. Try again in ${remaining}s. (Last failed: ${name})`);
    }

    // [ARCHITECT] Re-entrancy Check: If lock is already held in this stack, bypass to prevent deadlock
    if (this.heldLocks.has(lockKey)) {
        return await fn();
    }

    if (!this.pathMutexes.has(lockKey)) {
      this.pathMutexes.set(lockKey, withTimeout(new Mutex(), customTimeout, new Error(`VFS Lock Operation Timeout (${customTimeout}ms) for "${name}".`)));
    }
    const mutex = this.pathMutexes.get(lockKey)!;

    // Cleanup logic: Schedule removal if not used
    const cleanup = () => {
        if (!mutex.isLocked() && lockKey !== 'global') {
            this.pathMutexes.delete(lockKey);
        }
    };

    const startTime = performance.now();
    let attempt = 0;
    let lastError: any;

    while (attempt <= maxRetries) {
      try {
        return await mutex.runExclusive(async () => {
          this.heldLocks.add(lockKey);
          try {
            const result = await fn();
            const latency = performance.now() - startTime;
            this.lastLatency = latency;
            this.lastOperationLatencies.push(latency);
            if (this.lastOperationLatencies.length > this.LATENCY_SAMPLE_SIZE) {
                this.lastOperationLatencies.shift();
            }
            this.consecutiveFailures = 0;
            return result;
          } finally {
            this.heldLocks.delete(lockKey);
            // Architect Cleanup: Release mutex from map if idle to prevent memory leak
            setTimeout(cleanup, 1000);
          }
        });
      } catch (e) {
        lastError = e;
        const errMsg = e instanceof Error ? e.message : String(e);
        if (errMsg.includes('Timeout') || errMsg.includes('ENOENT') || errMsg.includes('EISDIR')) {
            break; // Don't retry on timeout, not found, or is directory
        }
        attempt++;
        if (attempt <= maxRetries) {
            const backoff = Math.pow(2, attempt - 1) * 500;
            await new Promise(r => setTimeout(r, backoff));
        }
      }
    }

    const finalErrMsg = lastError instanceof Error ? lastError.message : String(lastError);
    if (!finalErrMsg.includes('ENOENT') && !finalErrMsg.includes('EISDIR')) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
          const avgLatency = this.lastOperationLatencies.reduce((a, b) => a + b, 0) / (this.lastOperationLatencies.length || 1);
          const adaptiveCooldown = Math.min(60000, this.CIRCUIT_OPEN_DURATION + (avgLatency * 2));
          this.circuitOpenUntil = Date.now() + adaptiveCooldown;
          LoggerService.error('VFS', `CIRCUIT BREAKER ACTIVATED for ${adaptiveCooldown}ms. Last failed: "${name}"`);
      }
    } else {
      this.consecutiveFailures = 0; // Reset failures on expected errors
    }
    
    throw lastError;
  }

  /**
   * Enqueues a native storage synchronization task without blocking the main VFS lock.
   */
  private enqueueNativeSync(syncOp: () => Promise<void>, name: string) {
    this.nativeSyncQueue = this.nativeSyncQueue.then(async () => {
      try {
        await Promise.race([
          syncOp(),
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error(`Native Sync Timeout: ${name}`)), 30000)
          )
        ]);
      } catch (err) {
        LoggerService.warn('VFS', `Native Sync Failed [${name}]:`, err);
      }
    }).catch(() => {});
  }

  getLastLatency(): number {
    return this.lastLatency;
  }

  async reconcile(): Promise<void> {
    return this.lock(async () => {
      LoggerService.info('VFS', 'Starting cache reconciliation...');
      let fixedCount = 0;
      
      // Reconcile file cache
      const cacheEntries = Array.from(this.fileCache.entries());
      for (const [path, cachedContent] of cacheEntries) {
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
    }, 'reconcile', 60000, 3, 'reconcile');
  }

  async reconcileNative(): Promise<void> {
    return this.lock(async () => {
      LoggerService.info('VFS', 'Starting deep native reconciliation...');
      if (!nativeBridge.isAvailable()) {
        LoggerService.warn('VFS', 'Native bridge not available for deep reconciliation.');
        return;
      }
      try {
        const files = await NativeStorage.listDir({ path: '/', recursive: true });
        let restored = 0;
        const fs = virtualFS.getFS();
        for (const file of files) {
          if (!file.isDirectory) {
            const response = await NativeStorage.readFile({ path: file.path });
            const content = response.data as string;
            fs.writeFileSync(file.path, content);
            restored++;
          }
        }
        this.fileCache.clear();
        this.dirCache.clear();
        LoggerService.info('VFS', `Deep reconciliation complete. Restored ${restored} files.`);
      } catch (e) {
        LoggerService.error('VFS', 'Deep reconciliation failed.', e);
        throw e;
      }
    }, 'reconcileNative', 60000, 1, 'global');
  }

  async initialize(): Promise<void> {
    return this.lock(async () => {
      // Ensure root exists and basic structure is ready
      try {
        // Use a timeout for VFS initialization to prevent hanging the whole app
        let timeoutId: NodeJS.Timeout | null = null;
        await Promise.race([
            virtualFS.mkdir('/').then(res => { if (timeoutId) clearTimeout(timeoutId); return res; }),
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('VFS Initialization Timeout')), 10000);
            })
        ]);
      } catch (e) {
        LoggerService.info('VFS', 'Root directory check during initialization', e);
      }
    }, 'initialize', 60000, 3, 'initialize');
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
    }, `readdir:${path}`);
  }

  async waitForWrites(): Promise<void> {
    await this.writeQueue;
  }

  private readonly CORE_FILES = [
    '/src/workers/ai.worker.ts',
    '/src/services/vfsService.ts',
    '/src/services/hamEngine/utils.ts',
    '/src/services/aiWorkerService.ts'
  ];

  async writeFile(rawPath: string, content: string, source: string = 'system'): Promise<void> {
    const path = this.sanitizePath(rawPath);
    const lockKey = `file:${path}`;
    this.isWriting = true;
    const writeOp = this.lock(async () => {
      // Ensure parent directories exist
      const lastSlash = path.lastIndexOf('/');
      if (lastSlash > 0) {
        const dir = path.substring(0, lastSlash);
        await this.ensureDir(dir);
      }

      try {
        const currentContent = await virtualFS.readFile(path);
        if (currentContent === content) return;
        
        // Core System Protection: Backup before write
        if (this.CORE_FILES.includes(path) && source !== 'system-rollback') {
            const backupPath = `/src/.backup${path}`;
            const backupDir = backupPath.substring(0, backupPath.lastIndexOf('/'));
            await this.ensureDir(backupDir);
            await virtualFS.writeFile(backupPath, currentContent);
            LoggerService.info('VFS', `Core file backup created: ${backupPath}`);
        }
      } catch (e) {}

      // Atomic Write Protocol: Write to .tmp first, then rename
      const tempPath = `${path}.tmp_${Date.now()}`;
      try {
        await universalFs.writeFile(tempPath, content);
        
        // Verify content integrity (basic check)
        const written = await universalFs.readFile(tempPath);
        if (written.length !== content.length) {
            throw new Error("Atomic Write Failed: Content length mismatch");
        }

        // Rename to final path (Atomic operation)
        // Note: universalFs doesn't have rename yet, so we write and delete
        await universalFs.writeFile(path, content);
        await universalFs.deleteFile(tempPath);
        
        this.updateCache(path, content);
        this.invalidateCache(path); // Clear dir cache
        this.indexFile(path, content); // Index in Dexie
        
        // Sync to Native Storage (Non-blocking)
        this.enqueueNativeSync(async () => {
          if (nativeBridge.isAvailable()) {
            const projectId = virtualFS.getCurrentProjectId();
            const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
            await NativeStorage.writeFile({ path: nativePath, data: content });
          }
        }, `writeFile:${path}`);
      } catch (e) {
        // Cleanup temp file on failure with safer checks
        try { 
            const exists = await universalFs.exists(tempPath);
            if(exists) await universalFs.deleteFile(tempPath); 
        } catch (cleanupErr) {
            // Silently ignore if cleanup fails to avoid masking the original error
        }
        throw e;
      }
      
      this.notify('update', path, source);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ham-file-changed', {
          detail: { path, content }
        }));
      }
    }, `writeFile:${path}`, 60000, 3, lockKey);
    
    writeOp.finally(() => {
        this.isWriting = false;
    });
    
    this.writeQueue = writeOp.catch(() => {});
    return writeOp;
  }

  async appendFile(rawPath: string, content: string, source: string = 'system'): Promise<void> {
    const path = this.sanitizePath(rawPath);
    const lockKey = `file:${path}`;
    return this.lock(async () => {
      let currentContent = '';
      try {
        currentContent = await virtualFS.readFile(path);
      } catch (e) {}
      await this.writeFile(path, currentContent + content, source);
    }, `appendFile:${path}`, 60000, 3, lockKey);
  }

  async readFile(rawPath: string, bypassCache: boolean = false): Promise<string> {
    const path = this.sanitizePath(rawPath);
    if (!bypassCache && this.fileCache.has(path)) {
        return this.fileCache.get(path)!;
    }
    return this.lock(async () => {
      const content = await universalFs.readFile(path);
      this.updateCache(path, content);
      return content;
    }, `readFile:${path}`, 55000, 3, path);
  }

  async readFileAsBuffer(rawPath: string): Promise<Uint8Array> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      return await virtualFS.readFileAsBuffer(path);
    }, `readFileAsBuffer:${path}`, 55000, 3, path);
  }

  async deleteFile(rawPath: string): Promise<void> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      await universalFs.deleteFile(path);
      this.invalidateCache(path);
      this.unindexFile(path); // Remove from Dexie
      this.notify('delete', path);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ham-file-changed', {
          detail: { path, content: null }
        }));
      }
      
      // Sync to Native Storage (Non-blocking)
      this.enqueueNativeSync(async () => {
        if (nativeBridge.isAvailable()) {
          const projectId = virtualFS.getCurrentProjectId();
          const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
          await NativeStorage.deleteFile({ path: nativePath });
        }
      }, `deleteFile:${path}`);
    }, `deleteFile:${path}`, 60000, 3, path);
  }

  async renameFile(rawOldPath: string, rawNewPath: string): Promise<void> {
    const oldPath = this.sanitizePath(rawOldPath);
    const newPath = this.sanitizePath(rawNewPath);
    return this.lock(async () => {
      const content = await universalFs.readFile(oldPath);
      await universalFs.writeFile(newPath, content);
      await universalFs.deleteFile(oldPath);
      
      this.invalidateCache(oldPath);
      this.invalidateCache(newPath);
      
      // Update Dexie index
      try {
        await this.unindexFile(oldPath);
        await this.indexFile(newPath, content);
      } catch (e) {
        // It might be a directory, skip content reading
      }

      this.notify('rename', oldPath, newPath);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ham-file-changed', {
          detail: { path: oldPath, content: null }
        }));
        try {
          window.dispatchEvent(new CustomEvent('ham-file-changed', {
            detail: { path: newPath, content }
          }));
        } catch (e) {}
      }
      
      // Sync to Native Storage (Non-blocking)
      this.enqueueNativeSync(async () => {
        if (nativeBridge.isAvailable()) {
          const projectId = virtualFS.getCurrentProjectId();
          const nativeOldPath = `projects/${projectId}${oldPath.startsWith('/') ? oldPath : '/' + oldPath}`;
          const nativeNewPath = `projects/${projectId}${newPath.startsWith('/') ? newPath : '/' + newPath}`;
          await NativeStorage.rename({ oldPath: nativeOldPath, newPath: nativeNewPath });
        }
      }, `renameFile:${oldPath}->${newPath}`);
    }, `renameFile:${oldPath}->${newPath}`, 60000, 3, `${oldPath}->${newPath}`);
  }

  async move(oldPath: string, newPath: string): Promise<void> {
    return this.renameFile(oldPath, newPath);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    return this.renameFile(oldPath, newPath);
  }

  async exists(rawPath: string): Promise<boolean> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      try {
        return await universalFs.exists(path);
      } catch (e) {
        return false;
      }
    }, `exists:${path}`, 55000, 3, path);
  }

  async mkdir(rawPath: string): Promise<void> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      await universalFs.mkdir(path);
      this.notify('create', path);
      
      // Sync to Native Storage (Non-blocking)
      this.enqueueNativeSync(async () => {
        if (nativeBridge.isAvailable()) {
          const projectId = virtualFS.getCurrentProjectId();
          const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
          await NativeStorage.mkdir({ path: nativePath });
        }
      }, `mkdir:${path}`);
    }, `mkdir:${path}`, 60000, 3, path);
  }

  async unlink(rawPath: string): Promise<void> {
    const path = this.sanitizePath(rawPath);
    return this.deleteFile(path);
  }

  async bulkWrite(rawFiles: { path: string; content: string }[]): Promise<void> {
    const files = rawFiles.map(f => ({ ...f, path: this.sanitizePath(f.path) }));
    // Adaptive Timeout for bulk operations: 1s per 10 files, min 15s
    const adaptiveTimeout = Math.max(15000, files.length * 100);
    return this.lock(async () => {
      // Ensure directories exist for all files
      for (const f of files) {
          const lastSlash = f.path.lastIndexOf('/');
          if (lastSlash > 0) {
              await this.ensureDir(f.path.substring(0, lastSlash));
          }
      }
      // Use universalFs for bulk write
      for (const f of files) {
        await universalFs.writeFile(f.path, f.content);
      }
      files.forEach(f => {
          this.updateCache(f.path, f.content);
          this.invalidateCache(f.path);
          this.indexFile(f.path, f.content); // Index in Dexie
          this.notify('update', f.path);
      });

      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ham-bulk-file-changed', {
              detail: { files }
          }));
      }
      
      // Sync to Native Storage (Non-blocking)
      this.enqueueNativeSync(async () => {
        if (nativeBridge.isAvailable()) {
          const projectId = virtualFS.getCurrentProjectId();
          const nativeFiles = files.map(f => ({
            path: `projects/${projectId}${f.path.startsWith('/') ? f.path : '/' + f.path}`,
            data: f.content
          }));
          await NativeStorage.bulkWrite({ files: nativeFiles });
        }
      }, `bulkWrite:${files.length} files`);
    }, 'bulkWrite', adaptiveTimeout, 3, 'bulkWrite');
  }

  async bulkDelete(rawPaths: string[]): Promise<void> {
    const paths = rawPaths.map(p => this.sanitizePath(p));
    return this.lock(async () => {
      for (const path of paths) {
        await virtualFS.unlink(path);
        this.invalidateCache(path);
        this.unindexFile(path); // Remove from Dexie
        this.notify('delete', path);
      }
      
      // Sync to Native Storage (Non-blocking)
      this.enqueueNativeSync(async () => {
        if (nativeBridge.isAvailable()) {
          const projectId = virtualFS.getCurrentProjectId();
          const nativePaths = paths.map(p => `projects/${projectId}${p.startsWith('/') ? p : '/' + p}`);
          await NativeStorage.bulkDelete({ paths: nativePaths });
        }
      }, `bulkDelete:${paths.length} paths`);
    }, 'bulkDelete', Math.max(15000, paths.length * 100), 3, 'bulkDelete');
  }

  async bulkRead(rawPaths: string[]): Promise<{ path: string; content: string }[]> {
    const paths = rawPaths.map(p => this.sanitizePath(p));
    return this.lock(async () => {
      const results = [];
      for (const path of paths) {
        try {
          const content = await virtualFS.readFile(path);
          results.push({ path, content });
        } catch (e) {
            LoggerService.error('VFS', `Error reading file ${path} in bulkRead`, e);
        }
      }
      return results;
    }, 'bulkRead', Math.max(15000, paths.length * 50), 3, 'bulkRead');
  }

  async listDir(rawPath: string): Promise<string[]> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      return await universalFs.listDir(path);
    }, `listDir:${path}`, 55000, 3, path);
  }

  async stat(rawPath: string): Promise<Record<string, unknown>> {
    const path = this.sanitizePath(rawPath);
    return this.lock(async () => {
      return await universalFs.stat(path) as Record<string, unknown>;
    }, `stat:${path}`, 55000, 3, path);
  }

  /**
   * search — Grep-like functionality implemented over VFS.
   * Returns a list of files matching the provided regex pattern.
   */
  async search(pattern: string): Promise<{ path: string; matches: { line: number; text: string }[] }[]> {
    return this.lock(async () => {
      const snapshot = await vfsExtraService.getProjectSnapshot({ full: true, skipBinary: true });
      const results: { path: string; matches: { line: number; text: string }[] }[] = [];
      
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, 'i');
      } catch (e) {
        throw new Error(`Invalid search pattern: "${pattern}"`);
      }

      for (const file of snapshot.files) {
        if (!file.content) continue;
        const lines = file.content.split('\n');
        const matches: { line: number; text: string }[] = [];
        
        lines.forEach((text, index) => {
          if (regex.test(text)) {
            matches.push({ line: index + 1, text: text.trim() });
          }
        });

        if (matches.length > 0) {
          results.push({ path: file.path, matches });
        }
      }
      return results;
    }, 'search', 300000, 1, 'search');
  }

  async getSharedContextBuffer(options: { maxLength?: number } = {}): Promise<SharedArrayBuffer | null> {
    return this.lock(async () => {
      // Call vfsExtraService directly to avoid deadlock with this.getProjectSnapshot
      const snapshot = await vfsExtraService.getProjectSnapshot({ full: true, skipBinary: true });
      const context = snapshot.files
        .filter(f => !f.isBinary)
        .map(f => `--- FILE: ${f.path} ---\n${f.content}\n`)
        .join('\n');
      
      const encoder = new TextEncoder();
      const encoded = encoder.encode(context);
      const maxLength = Math.max(options.maxLength || 0, encoded.byteLength, 1024 * 1024); // Ensure it's at least as big as encoded
      
      if (typeof SharedArrayBuffer === 'undefined') {
          LoggerService.warn('VFS', 'SharedArrayBuffer is not defined. Zero-copy context is disabled.');
          return null;
      }

      const sab = new SharedArrayBuffer(maxLength);
      const view = new Uint8Array(sab);
      view.set(encoded);
      
      return sab;
    }, 'getSharedContextBuffer', 60000, 3, 'sharedContextBuffer');
  }

  setProjectId(id: string) {
    virtualFS.setProjectId(id);
    this.notify('update', '/');
  }

  getLastModified(rawPath: string): number {
    const path = this.sanitizePath(rawPath);
    return virtualFS.getLastModified(path);
  }

  async getProjectSnapshot(options: { full?: boolean, skipBinary?: boolean } = {}): Promise<{ id: string, name: string, files: { path: string, content: string, isBinary?: boolean }[] }> {
    return this.lock(() => vfsExtraService.getProjectSnapshot(options), 'getProjectSnapshot', 1800000, 3, 'getProjectSnapshot');
  }

  async createSnapshot(name: string = 'auto-save'): Promise<string> {
    return this.lock(() => vfsExtraService.createSnapshot(name), 'createSnapshot', 120000, 3, 'createSnapshot');
  }

  async restoreSnapshot(snapshotId: string): Promise<void> {
    // Call restoreSnapshot without locking, as bulkWrite will handle its own locking
    return vfsExtraService.restoreSnapshot(snapshotId, (files) => this.bulkWrite(files));
  }

  async init(path: string): Promise<void> {
    return this.lock(() => vfsExtraService.initGit(path), 'gitInit', 60000, 3, 'gitInit');
  }

  async status(path: string): Promise<unknown[]> {
    return this.lock(() => vfsExtraService.gitStatus(path), 'gitStatus', 60000, 3, 'gitStatus');
  }

  async commit(path: string, message: string, author: { name: string, email: string }): Promise<void> {
    return this.lock(() => vfsExtraService.gitCommit(path, message, author), 'gitCommit', 60000, 3, 'gitCommit');
  }

  async getHeadContent(repoPath: string, filePath: string): Promise<string> {
    return this.lock(() => vfsExtraService.gitGetHeadContent(repoPath, filePath), 'gitGetHeadContent', 60000, 3, 'gitGetHeadContent');
  }

  async push(path: string, remoteUrl: string, token: string): Promise<void> {
    return this.lock(() => vfsExtraService.gitPush(path, remoteUrl, token), 'gitPush', 120000, 3, 'gitPush');
  }

  async pull(path: string, remoteUrl: string, token: string): Promise<void> {
    return this.lock(() => vfsExtraService.gitPull(path, remoteUrl, token), 'gitPull', 120000, 3, 'gitPull');
  }
}

export const vfs = new VFSService();

