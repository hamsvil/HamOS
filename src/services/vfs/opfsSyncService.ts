/* eslint-disable no-useless-assignment */

/**
 * OPFS SYNC SERVICE - The Singularity High-Performance Filesystem Engine
 * Part of THE HAM ENGINE SINGULARITY Architecture
 */

export class OpfsSyncService {
  private worker: Worker | null = null;
  private sab: SharedArrayBuffer | null = null;
  private int32: Int32Array | null = null;
  private uint8: Uint8Array | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined') {
      this.sab = new SharedArrayBuffer(1024 * 1024 * 2); // 2MB buffer
      this.int32 = new Int32Array(this.sab);
      this.uint8 = new Uint8Array(this.sab, 4);
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    this.worker = new Worker(new URL('../../workers/opfs.worker.ts', import.meta.url), {
      type: 'module'
    });

    if (this.sab) {
      this.worker.postMessage({ type: 'INIT_SAB', sab: this.sab });
    }

    this.isInitialized = true;
    // console.log('[OpfsSyncService] Initialized');
  }

  /**
   * Synchronous write (only works if SharedArrayBuffer is available)
   * Note: This will block the thread it's called from!
   */
  writeFileSync(path: string, content: string | Uint8Array) {
    if (!this.sab || !this.int32 || !this.uint8) {
      throw new Error('SharedArrayBuffer not supported in this environment');
    }

    const request = JSON.stringify({ type: 'WRITE', path, content });
    const encoder = new TextEncoder();
    const data = encoder.encode(request);
    
    this.uint8.fill(0);
    this.uint8.set(data);
    
    Atomics.store(this.int32, 0, 1); // State 1: Request
    Atomics.notify(this.int32, 0);
    
    // Wait for response (state 2 or 3)
    // Atomics.wait(this.int32, 0, 1); // Wait until state is not 1
    
    // Busy wait for main thread (Atomics.wait is not allowed on main thread)
    let timeout = Date.now() + 10000; // Increase to 10s for large files
    while (Atomics.load(this.int32, 0) === 1) {
      if (Date.now() > timeout) {
        Atomics.store(this.int32, 0, 0); // Reset state
        console.error(`[OpfsSyncService] Timeout writing to ${path}`);
        throw new Error('OPFS Sync timeout');
      }
    }
    
    const status = Atomics.load(this.int32, 0);
    if (status !== 2) {
      console.error(`[OpfsSyncService] Write failed for ${path} with status ${status}`);
      throw new Error(`OPFS Sync Write failed with status ${status}`);
    }
  }

  /**
   * Synchronous read
   */
  readFileSync(path: string): Uint8Array | null {
    if (!this.sab || !this.int32 || !this.uint8) {
      throw new Error('SharedArrayBuffer not supported in this environment');
    }

    const request = JSON.stringify({ type: 'READ', path });
    const encoder = new TextEncoder();
    const data = encoder.encode(request);
    
    this.uint8.fill(0);
    this.uint8.set(data);
    
    Atomics.store(this.int32, 0, 1); // State 1: Request
    Atomics.notify(this.int32, 0);
    
    let timeout = Date.now() + 10000;
    while (Atomics.load(this.int32, 0) === 1) {
      if (Date.now() > timeout) {
        Atomics.store(this.int32, 0, 0); // Reset state
        console.error(`[OpfsSyncService] Timeout reading from ${path}`);
        throw new Error('OPFS Sync timeout');
      }
    }
    
    const status = Atomics.load(this.int32, 0);
    if (status === 2) {
      return this.uint8.slice(0, findNull(this.uint8));
    } else if (status === 3) {
      return null;
    } else {
      console.error(`[OpfsSyncService] Read failed for ${path} with status ${status}`);
      throw new Error(`OPFS Sync Read failed with status ${status}`);
    }
  }

  async writeFile(path: string, content: string | Uint8Array) {
    if (!this.isInitialized) await this.initialize();
    
    return new Promise<void>((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.worker?.removeEventListener('message', handler);
          if (e.data.type === 'SUCCESS') resolve();
          else reject(new Error(e.data.payload));
        }
      };
      this.worker?.addEventListener('message', handler);
      this.worker?.postMessage({ id, type: 'WRITE', payload: { path, content } });
    });
  }

  async readFile(path: string): Promise<Uint8Array | null> {
    if (!this.isInitialized) await this.initialize();
    
    return new Promise<Uint8Array | null>((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.worker?.removeEventListener('message', handler);
          if (e.data.type === 'SUCCESS') resolve(e.data.payload);
          else reject(new Error(e.data.payload));
        }
      };
      this.worker?.addEventListener('message', handler);
      this.worker?.postMessage({ id, type: 'READ', payload: { path } });
    });
  }
}

function findNull(arr: Uint8Array) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 0) return i;
  }
  return arr.length;
}

export const opfsSyncService = new OpfsSyncService();
