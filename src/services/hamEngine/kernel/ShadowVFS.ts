/* eslint-disable no-useless-assignment */
import { vfs } from '../../vfsService';
import { ShadowStorage } from './ShadowStorage';
import { ShadowState } from './ShadowState';

class AsyncMutex {
  private promise = Promise.resolve();
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.promise;
    let resolve: () => void;
    this.promise = new Promise(r => resolve = r);
    await prev;
    try {
      return await fn();
    } finally {
      resolve!();
    }
  }
}

/**
 * THE SHADOW VFS (SQR-SVFS) V2.0
 * Provides a non-destructive workspace for AI operations.
 * Uses a staged memory-first approach with IndexedDB spillover.
 */
export class ShadowVFS {
  private static instance: ShadowVFS;
  private state = new ShadowState();
  private storage = new ShadowStorage();
  private mutex = new AsyncMutex();
  
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
  private readonly MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB limit
  
  private checkpoint: { state: ShadowState; offloadedPaths: Set<string> } | null = null;

  private constructor() {}

  public static getInstance(): ShadowVFS {
    if (!ShadowVFS.instance) {
      ShadowVFS.instance = new ShadowVFS();
    }
    return ShadowVFS.instance;
  }

  /**
   * Stages a write operation.
   */
  public async write(path: string, content: string): Promise<void> {
    if (content.length > this.MAX_FILE_SIZE) {
      throw new Error(`[SHADOW VFS]: File size exceeds limit: ${path}`);
    }
    
    await this.mutex.runExclusive(async () => {
      let originalSizeIncrease = 0;
      
      // Capture original state if not already captured
      if (!this.state.originalMap.has(path)) {
        try {
          if (await vfs.exists(path)) {
            const originalContent = await vfs.readFile(path);
            this.state.originalMap.set(path, originalContent);
            originalSizeIncrease = originalContent.length;
          } else {
            this.state.originalMap.set(path, ''); 
          }
        } catch {
          this.state.originalMap.set(path, '');
        }
      }
      
      const oldShadowContent = this.state.shadowMap.get(path) || '';
      const shadowSizeIncrease = content.length - oldShadowContent.length;
      
      const projectedSize = this.state.totalSize + originalSizeIncrease + shadowSizeIncrease;
      
      if (projectedSize > this.MAX_TOTAL_SIZE) {
        // Spill to disk
        await this.storage.offload(path, content);
        this.state.updateSize(originalSizeIncrease, -oldShadowContent.length);
        this.state.shadowMap.delete(path);
      } else {
        this.state.shadowMap.set(path, content);
        this.state.updateSize(originalSizeIncrease, shadowSizeIncrease);
        if (this.storage.has(path)) {
          await this.storage.delete(path);
        }
      }
    });
  }

  /**
   * Reads a file, prioritizing shadow state.
   */
  public async read(path: string): Promise<string> {
    return await this.mutex.runExclusive(async () => {
      const memory = this.state.shadowMap.get(path);
      if (memory !== undefined) return memory;
      
      const offloaded = await this.storage.load(path);
      if (offloaded !== undefined) return offloaded;
      
      return await vfs.readFile(path);
    });
  }

  /**
   * Checks existence, prioritizing shadow state.
   */
  public async exists(path: string): Promise<boolean> {
    return await this.mutex.runExclusive(async () => {
      const memory = this.state.shadowMap.get(path);
      if (memory !== undefined) return memory !== '';
      
      const offloaded = await this.storage.load(path);
      if (offloaded !== undefined) return offloaded !== '';
      
      return await vfs.exists(path);
    });
  }

  /**
   * Flushes staged changes to main VFS.
   */
  public async flushToMainVFS(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      const staged = new Map(this.state.shadowMap);
      const offloadedPaths = this.storage.getOffloadedPaths();
      
      for (const path of offloadedPaths) {
        const content = await this.storage.load(path);
        if (content !== undefined) staged.set(path, content);
      }

      const committed: string[] = [];
      try {
        for (const [path, content] of staged.entries()) {
          if (content === '') {
            if (await vfs.exists(path)) await vfs.deleteFile(path);
          } else {
            await vfs.writeFile(path, content, 'ai-shadow-flush');
          }
          committed.push(path);
        }
      } catch (error) {
        // Rollback main VFS on failure
        for (const path of committed) {
          const original = this.state.originalMap.get(path);
          if (original !== undefined) {
            if (original === '') {
              try { await vfs.deleteFile(path); } catch {}
            } else {
              try { await vfs.writeFile(path, original, 'ai-shadow-rollback'); } catch {}
            }
          }
        }
        throw error;
      }
    });
  }

  public async commitToMainVFS(): Promise<void> {
    await this.flushToMainVFS();
    await this.clear();
  }

  public async createCheckpoint(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      this.checkpoint = {
        state: this.state.clone(),
        offloadedPaths: this.storage.getOffloadedPaths()
      };
    });
  }

  public async restoreCheckpoint(): Promise<string> {
    if (!this.checkpoint) return "[SHADOW VFS]: No checkpoint found.";

    await this.mutex.runExclusive(async () => {
      const currentOffloaded = this.storage.getOffloadedPaths();
      for (const path of currentOffloaded) {
        if (!this.checkpoint!.offloadedPaths.has(path)) {
          await this.storage.delete(path);
        }
      }

      this.state = this.checkpoint!.state.clone();
      this.storage.setOffloadedPaths(this.checkpoint!.offloadedPaths);
    });

    return "[SHADOW VFS]: Restored to last checkpoint.";
  }

  public async rollback(): Promise<string> {
    const count = this.state.shadowMap.size + this.storage.getOffloadedPaths().size;
    
    await this.mutex.runExclusive(async () => {
      for (const [path, original] of this.state.originalMap.entries()) {
        if (original === '') {
          try { await vfs.deleteFile(path); } catch {}
        } else {
          try { await vfs.writeFile(path, original, 'ai-shadow-rollback'); } catch {}
        }
      }
      await this.clearInternal();
    });

    return `[SHADOW VFS]: Rollback executed. ${count} changes discarded.`;
  }

  public hasStagedChanges(path: string): boolean {
    return this.state.shadowMap.has(path) || this.storage.has(path);
  }

  public async getStagedChanges(): Promise<Map<string, string>> {
    const changes = new Map(this.state.shadowMap);
    const offloaded = this.storage.getOffloadedPaths();
    for (const path of offloaded) {
      const content = await this.storage.load(path);
      if (content !== undefined) changes.set(path, content);
    }
    return changes;
  }

  public async clear(): Promise<void> {
    await this.mutex.runExclusive(async () => {
      await this.clearInternal();
    });
  }

  private async clearInternal(): Promise<void> {
    this.state.clear();
    await this.storage.cleanup();
    this.checkpoint = null;
  }
}

export const shadowVFS = ShadowVFS.getInstance();
