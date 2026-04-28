
/**
 * [HAMLI CORE MEMORY]
 * Real-time shared memory system for the 24-agent swarm.
 * Enables sub-millisecond save/load synchronization.
 */
export class SharedMemory {
  private static instance: SharedMemory;
  private memoryMap: Map<string, any> = new Map();
  private observers: Set<(key: string, value: any) => void> = new Set();

  private constructor() {
    console.log('[SharedMemory] Hamli Core Memory Online.');
  }

  public static getInstance(): SharedMemory {
    if (!SharedMemory.instance) {
      SharedMemory.instance = new SharedMemory();
    }
    return SharedMemory.instance;
  }

  public save(key: string, value: any) {
    this.memoryMap.set(key, value);
    this.notifyObservers(key, value);
  }

  public load(key: string): any {
    return this.memoryMap.get(key);
  }

  public getAllMemory() {
    return Object.fromEntries(this.memoryMap);
  }

  public subscribe(callback: (key: string, value: any) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers(key: string, value: any) {
    this.observers.forEach(cb => cb(key, value));
  }

  /**
   * Sync memory to persistent storage (IndexedDB/VFS or Node.js FS)
   */
  public async persist() {
    try {
      const data = JSON.stringify(this.getAllMemory(), null, 2);
      if (typeof window !== 'undefined') {
        const { vfs } = await import('./FileSystemBridge');
        await vfs.writeFile('/.hp_central_memory.json', data);
      } else {
        // [Node.js Architecture] Persist directly to filesystem
        const fs = await import('node:fs');
        const path = await import('node:path');
        fs.writeFileSync(path.join(process.cwd(), 'hamli_memory.json'), data);
      }
    } catch (e) {
      console.warn('[SharedMemory] Persist failed:', e);
    }
  }
}

export const hamliCoreMemory = SharedMemory.getInstance();
