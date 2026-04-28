/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { nativeBridge } from '../utils/nativeBridge';
import { NativeStorageBulk } from './NativeStorageBulk';

let fs: any = null;
let pfs: any = null;

async function initFs() {
  if (!fs) {
    // @ts-ignore
    const LFS = (await import('@isomorphic-git/lightning-fs')).default;
    fs = new LFS('fs');
    pfs = fs.promises;
  }
}

const normalizePath = (path: string) => {
  if (!path) return '/';
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  return normalized.startsWith('/') ? normalized : '/' + normalized;
};

// File-based locking mechanism to prevent race conditions
const fileLocks = new Map<string, Promise<unknown>>();

async function acquireLock<T>(filePath: string, task: () => Promise<T>): Promise<T> {
  const previousLock = fileLocks.get(filePath) || Promise.resolve();
  const currentLock = previousLock.then(task).catch(task); // Proceed even if previous failed
  fileLocks.set(filePath, currentLock);
  
  try {
    return await currentLock;
  } finally {
    if (fileLocks.get(filePath) === currentLock) {
      fileLocks.delete(filePath);
    }
  }
}

export interface NativeStoragePlugin {
  writeFile(options: { path: string; data: any; encoding?: string }): Promise<{ success: boolean }>;
  readFile(options: { path: string; encoding?: string }): Promise<{ data: any }>;
  deleteFile(options: { path: string }): Promise<{ success: boolean }>;
  readdir(options: { path: string }): Promise<{ files: string[] }>;
  exists(options: { path: string }): Promise<{ exists: boolean }>;
  mkdir(options: { path: string }): Promise<{ success: boolean }>;
  rmdir(options: { path: string }): Promise<{ success: boolean }>;
  rename(options: { oldPath: string; newPath: string }): Promise<{ success: boolean }>;
  copyFile(options: { sourcePath: string; destPath: string }): Promise<{ success: boolean }>;
  stat(options: { path: string }): Promise<{ size: number; mtime: number; isDirectory: boolean }>;
  getDiskUsage(): Promise<{ totalSize: number }>;
  getInternalDataDirectory(): Promise<{ path: string }>;
  cleanupOrphanTmp(): Promise<void>;
  bulkWrite(options: { files: { path: string; data: string }[] }): Promise<{ success: boolean; count: number }>;
  bulkDelete(options: { paths: string[] }): Promise<{ success: boolean }>;
  bulkRead(options: { paths: string[] }): Promise<{ files: { path: string; data: string }[] }>;
  listDir(options: { path: string; recursive?: boolean }): Promise<{ path: string; isDirectory: boolean }[]>;
  zip(options: { targetPaths: string[]; destZipPath: string }): Promise<{ success: boolean; error?: string }>;
  unzip(options: { zipPath: string; destDirPath: string }): Promise<{ success: boolean; error?: string }>;
}

const offlineQueue: { type: string; options: any }[] = [];

// Process queue when online
if (typeof window !== 'undefined' && !(window as any)._nativeStorageCleanupInitialized) {
  (window as any)._nativeStorageCleanupInitialized = true;
  setTimeout(() => {
    NativeStorage.cleanupOrphanTmp().catch(() => {});
  }, 2000);
  window.addEventListener('online', async () => {
    while (offlineQueue.length > 0) {
      const task = offlineQueue.shift();
      if (task) {
        try {
          if (task.type === 'writeFile') await NativeStorage.writeFile(task.options as { path: string; data: any; encoding?: string });
          if (task.type === 'bulkWrite') await NativeStorage.bulkWrite(task.options as { files: { path: string; data: string }[] });
        } catch (e) {
          // Failed to process offline task
        }
      }
    }
  });
} else if (typeof self !== 'undefined') {
  self.addEventListener('online', async () => {
    while (offlineQueue.length > 0) {
      const task = offlineQueue.shift();
      if (task) {
        try {
          if (task.type === 'writeFile') await NativeStorage.writeFile(task.options as { path: string; data: any; encoding?: string });
          if (task.type === 'bulkWrite') await NativeStorage.bulkWrite(task.options as { files: { path: string; data: string }[] });
        } catch (e) {
          // Failed to process offline task
        }
      }
    }
  });
}

export const NativeStorage: NativeStoragePlugin = {
  writeFile: async (options: { path: string; data: any; encoding?: string }) => {
    return acquireLock(options.path, async () => {
      if (!navigator.onLine && typeof options.data === 'string') {
          offlineQueue.push({ type: 'writeFile', options });
      }

      try {
    if (nativeBridge.isAvailable()) {
          // Stream Processing: Chunking for large files (Anti-OOM Protocol)
          const MAX_CHUNK_SIZE = 50 * 1024; // 50KB
          if (typeof options.data === 'string' && options.data.length > MAX_CHUNK_SIZE) {
             const dataString = options.data;
             const totalSize = dataString.length;
             let currentOffset = 0;
             
             // Convert string to base64 for native transport if needed, 
             // but since we are sending chunks, we can do it per chunk
             
             const totalChunks = Math.ceil(totalSize / MAX_CHUNK_SIZE);

             for (let i = 0; i < totalChunks; i++) {
                 const chunk = dataString.substring(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
                 const base64Chunk = btoa(unescape(encodeURIComponent(chunk)));
                 const isLast = (i === totalChunks - 1);

                 let success = false;
                 if ((window as any).AndroidWriteProxy) {
                     try {
                        success = (window as any).AndroidWriteProxy.writeChunk(options.path, base64Chunk, currentOffset, isLast);
                     } catch (e) {
                        console.warn("AndroidWriteProxy.writeChunk failed, falling back to FS", e);
                        success = false;
                     }
                 } else {
                     // Fallback to standard bridge if Proxy not available
                     try {
                        await nativeBridge.callAsync('Android', 'writeChunk', {
                            path: options.path,
                            chunk: base64Chunk,
                            offset: currentOffset,
                            isLast: isLast
                        });
                        success = true;
                     } catch (e) {
                        console.warn("nativeBridge.callAsync writeChunk failed, falling back to FS", e);
                        success = false;
                     }
                 }
                 
                 if (!success) {
                    // Break loop and trigger fallback to isomorphic-git FS (IDB)
                    throw new Error("Native chunk write failed, falling back to web storage");
                 }
                 currentOffset += chunk.length;

                 // Small delay to allow GC and UI thread to breathe
                 if (i % 5 === 0) await new Promise(r => setTimeout(r, 10));
             }
             return { success: true };
          } else {
             const result = nativeBridge.call('Android', 'writeFile', options);
             if (result) return result;
          }
        }
      } catch (e) {
        // Native writeFile failed, falling back to web storage
      }

      try {
        const normalizedPath = normalizePath(options.path);
        const tmpPath = `${normalizedPath}.tmp_${Date.now()}`;
        
        // Ensure directory exists
        const dir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        if (dir && dir !== '/') {
          const parts = dir.split('/').filter(p => p);
          let currentPath = '';
          for (const part of parts) {
            currentPath += '/' + part;
            try { await pfs.mkdir(currentPath); } catch (e: any) {}
          }
        }
        
        let writeData = options.data;
        if (options.encoding === 'base64' && typeof options.data === 'string') {
          const binaryString = atob(options.data);
          const bytes = new Uint8Array(binaryString.length);
          const CHUNK_SIZE = 10000;
          for (let i = 0; i < binaryString.length; i += CHUNK_SIZE) {
            const end = Math.min(i + CHUNK_SIZE, binaryString.length);
            for (let j = i; j < end; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }
            // Yield to main thread to prevent CPU overload
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          writeData = bytes;
        }

        // Atomic Write Swap: write to .tmp -> verify -> mv .tmp to original
        await pfs.writeFile(tmpPath, writeData as string | Uint8Array);
        
        // Basic verification (stat check)
        const tmpStats = await pfs.stat(tmpPath);
        if (tmpStats.size >= 0) {
            await pfs.rename(tmpPath, normalizedPath);
            return { success: true };
        } else {
            throw new Error('Atomic Write Verification Failed: Invalid tmp file size');
        }
      } catch (e) { 
        console.error('FS writeFile error (Atomic Swap):', e);
        return { success: false }; 
      }
    });
  },

  readFile: async (options: { path: string; encoding?: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'readFile', options);
        if (result) return result;
      }
    } catch (e) {
      console.warn('Native readFile failed, falling back to FS', e);
    }

    try {
      const normalizedPath = normalizePath(options.path);
      const data = await pfs.readFile(normalizedPath, options.encoding === 'base64' ? undefined : 'utf8');
      
      if (options.encoding === 'base64') {
        const uint8 = data as any as Uint8Array;
        let binary = '';
        const len = uint8.byteLength;
        const CHUNK_SIZE = 10000;
        
        for (let i = 0; i < len; i += CHUNK_SIZE) {
          const end = Math.min(i + CHUNK_SIZE, len);
          for (let j = i; j < end; j++) {
            binary += String.fromCharCode(uint8[j]);
          }
          // Yield to main thread to prevent CPU overload
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        return { data: btoa(binary) };
      }
      
      return { data: data.toString() };
    } catch (e: any) {
      console.error('FS readFile error:', e);
      return { data: '' };
    }
  },

  deleteFile: async (options: { path: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'deleteFile', options);
        if (result) return result;
      }
    } catch (e) {
      console.warn('Native deleteFile failed, falling back to FS', e);
    }

    try {
      const normalizedPath = normalizePath(options.path);
      await pfs.unlink(normalizedPath);
      return { success: true };
    } catch (e) { return { success: false }; }
  },

  readdir: async (options: { path: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'readdir', options);
        if (result) return result;
      }
    } catch (e) {
      console.warn('Native readdir failed, falling back to FS', e);
    }

    try {
      const normalizedPath = normalizePath(options.path);
      const files = await pfs.readdir(normalizedPath);
      return { files };
    } catch (e) { return { files: [] }; }
  },

  exists: async (options: { path: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'exists', options);
        if (result !== undefined) return { exists: !!result };
      }
    } catch (e) {}

    try {
      const normalizedPath = normalizePath(options.path);
      await pfs.stat(normalizedPath);
      return { exists: true };
    } catch (e) { return { exists: false }; }
  },

  mkdir: async (options: { path: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'mkdir', options);
        if (result) return result;
      }
    } catch (e) {
      console.warn('Native mkdir failed, falling back to FS', e);
    }

    try {
      const normalizedPath = normalizePath(options.path);
      const parts = normalizedPath.split('/').filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        try {
          await pfs.mkdir(currentPath);
        } catch (e: any) {
          if (e.code !== 'EEXIST' && e.code !== 'EISDIR') throw e;
        }
      }
      return { success: true };
    } catch (e) { return { success: false }; }
  },

  rmdir: async (options: { path: string; recursive?: boolean }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'rmdir', options);
        if (result) return result;
      }
    } catch (e) {
      console.warn('Native rmdir failed, falling back to FS', e);
    }

    try {
      const normalizedPath = normalizePath(options.path);
      await pfs.rmdir(normalizedPath, { recursive: options.recursive } as any);
      return { success: true };
    } catch (e) { return { success: false }; }
  },

  rename: async (options: { oldPath: string; newPath: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'rename', options);
        if (result) return result;
      }
    } catch (e) {
      console.warn('Native rename failed, falling back to FS', e);
    }

    try {
      const normalizedOld = normalizePath(options.oldPath);
      const normalizedNew = normalizePath(options.newPath);
      await pfs.rename(normalizedOld, normalizedNew);
      return { success: true };
    } catch (e) { return { success: false }; }
  },

  copyFile: async (options: { sourcePath: string; destPath: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'copyFile', options);
        if (result) return result;
      }
    } catch (e) {
      console.warn('Native copyFile failed, falling back to FS', e);
    }

    try {
      const normalizedSrc = normalizePath(options.sourcePath);
      const normalizedDst = normalizePath(options.destPath);
      
      const stats = await pfs.stat(normalizedSrc);
      if (stats.isDirectory()) {
        const copyDir = async (src: string, dst: string) => {
          await pfs.mkdir(dst);
          const files = await pfs.readdir(src);
          for (const file of files) {
            await copyDir(`${src}/${file}`, `${dst}/${file}`);
          }
        };
        await copyDir(normalizedSrc, normalizedDst);
      } else {
        const data = await pfs.readFile(normalizedSrc);
        await pfs.writeFile(normalizedDst, data);
      }
      return { success: true };
    } catch (e) { return { success: false }; }
  },

  stat: async (options: { path: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'stat', options);
        if (result) return result;
      }
    } catch (e) {
      console.warn('Native stat failed, falling back to FS', e);
    }

    try {
      const normalizedPath = normalizePath(options.path);
      const stats = await pfs.stat(normalizedPath);
      return { size: stats.size, mtime: stats.mtimeMs, isDirectory: stats.isDirectory() };
    } catch (e) { return { size: 0, mtime: 0, isDirectory: false }; }
  },

  getDiskUsage: NativeStorageBulk.getDiskUsage,

  getInternalDataDirectory: async () => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'getInternalDataDirectory', {});
        if (result) return result;
      }
    } catch (e) {
      // Native getInternalDataDirectory failed
    }
    // Return null to indicate failure to get native path, rather than falling back to root which is dangerous for native builds
    return { path: null };
  },

  cleanupOrphanTmp: async () => {
    try {
      await initFs();
      const files = await NativeStorageBulk.listDir({ path: '/', recursive: true });
      const now = Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;

      for (const file of files) {
        if (!file.isDirectory && file.path.includes('.tmp_')) {
          try {
            const stats = await pfs.stat(file.path);
            if (now - stats.mtimeMs > FIVE_MINUTES) {
              await pfs.unlink(file.path);
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('cleanupOrphanTmp failed', e);
    }
  },

  bulkWrite: (options) => NativeStorageBulk.bulkWrite(options, NativeStorage.writeFile),
  bulkDelete: NativeStorageBulk.bulkDelete,
  bulkRead: NativeStorageBulk.bulkRead,
  listDir: NativeStorageBulk.listDir,
  zip: NativeStorageBulk.zip,
  unzip: NativeStorageBulk.unzip
};
