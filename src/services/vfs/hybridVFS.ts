/* eslint-disable no-useless-assignment */
// [STABILITY] Promise chains verified
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { checkOPFSSupport } from '../../polyfills';
import { opfsSyncService } from './opfsSyncService';

/**
 * HYBRID VFS - The Eternal Storage
 * Part of THE HAM ENGINE SINGULARITY Architecture
 */
export class HybridVFS {
  private doc: Y.Doc;
  private files: Y.Map<Y.Text>;
  private persistence: IndexeddbPersistence;
  private isInitialized = false;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(projectName: string = 'ham-ai-studio-default') {
    this.doc = new Y.Doc();
    this.files = this.doc.getMap('files');
    
    // Primary Persistence: IndexedDB (for Yjs state)
    this.persistence = new IndexeddbPersistence(projectName, this.doc);
  }

  async initialize() {
    if (this.isInitialized) return;

    // Check for OPFS support and initialize sync service
    const hasOPFS = await checkOPFSSupport();
    if (hasOPFS) {
      try {
        await opfsSyncService.initialize();
        // console.log('[HybridVFS] OPFS Sync Service initialized');
      } catch (e) {
        console.warn('[HybridVFS] Failed to initialize OPFS Sync Service:', e);
      }
    }

    // Wait for IndexedDB persistence to load, with a timeout
    await Promise.race([
      new Promise<void>((resolve) => {
        this.persistence.once('synced', () => resolve());
      }),
      new Promise<void>((resolve) => setTimeout(() => {
        console.warn('[HybridVFS] IndexedDB sync timeout, proceeding anyway.');
        resolve();
      }, 3000))
    ]);

    this.isInitialized = true;
    // console.log('[HybridVFS] Initialized with', this.files.size, 'files');

    // Setup Service Worker communication
    this.setupSWCommunication();
  }

  private setupSWCommunication() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data.type === 'GET_VFS_FILE') {
          const content = await this.readFile(event.data.path);
          event.ports[0].postMessage({ content });
        }
      });
    }
  }

  async writeFile(path: string, content: string) {
    // Acquire lock to prevent race conditions between Yjs and OPFS
    let releaseLock: () => void;
    const lockPromise = new Promise<void>(resolve => { releaseLock = resolve; });
    const previousLock = this.writeLock;
    this.writeLock = this.writeLock.then(() => lockPromise);
    
    await previousLock;

    try {
      // 1. Update Yjs (for sync and history)
      let yText = this.files.get(path);
      if (!yText) {
        yText = new Y.Text();
        this.files.set(path, yText);
      }
      
      const currentContent = yText.toString();
      if (currentContent !== content) {
        this.doc.transact(() => {
          yText!.delete(0, yText!.length);
          yText!.insert(0, content);
        });
      }

      // 2. Update OPFS (for high-performance local access)
      try {
        await opfsSyncService.writeFile(path, content);
      } catch (e) {
        console.error('[HybridVFS] OPFS write error:', e);
      }

      // 3. Notify listeners (like WebContainer Sync Bridge)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ham-file-changed', {
          detail: { path, content }
        }));
      }
    } finally {
      releaseLock!();
    }
  }

  async readFile(path: string): Promise<string | null> {
    // 1. Try Yjs first (most up-to-date in-memory)
    const yText = this.files.get(path);
    if (yText) {
      return yText.toString();
    }

    // 2. Try OPFS fallback
    try {
      const data = await opfsSyncService.readFile(path);
      if (data) {
        return new TextDecoder().decode(data);
      }
    } catch (e) {
      // File not found in OPFS
    }

    return null;
  }

  async deleteFile(path: string) {
    this.files.delete(path);
    
    try {
      // We need to add delete to opfsSyncService if not already there
      // For now, we'll use a placeholder or add it
      // opfsSyncService.deleteFile(path);
    } catch (e) {
      console.error('[HybridVFS] OPFS delete error:', e);
    }

    // 3. Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ham-file-changed', {
        detail: { path, content: null }
      }));
    }
  }

  getFiles(): string[] {
    return Array.from(this.files.keys());
  }

  onFilesChange(callback: () => void) {
    this.files.observe(() => callback());
  }

  getDoc() {
    return this.doc;
  }
}

export const hybridVFS = new HybridVFS();
