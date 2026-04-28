/* eslint-disable no-useless-assignment */
// [STABILITY] Promise chains verified
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { vfs } from './vfsService';
import { safeStorage } from '../utils/storage';
import { diffChars } from 'diff';

class YjsService {
    private static instance: YjsService;
    private docs: Map<string, Y.Doc> = new Map();
    private providers: Map<string, WebsocketProvider> = new Map();
    private projectId: string | null = null;
    private isSyncing: boolean = false;
    private worker: Worker | null = null;
    
    // AI Lock mechanism
    private aiLocks: Set<string> = new Set();

    // Mutex Lock untuk mencegah Race Condition antara VFS dan Yjs
    private syncLock: Promise<void> = Promise.resolve();

    private constructor() {
        this.initWorker();
        
        // Listen to VFS changes to update Yjs docs (e.g., when AI writes to VFS)
        vfs.subscribe(async (event, path, source) => {
            if (source === 'yjs' || !this.projectId || !path) return;
            
            // Skip sync if file is locked by AI
            if (this.isFileLockedByAi(path)) return;

            if (event === 'update' || event === 'create') {
                this.syncLock = this.syncLock.then(async () => {
                    try {
                        const content = await vfs.readFile(path);
                        this.syncVfsToYjs(path, content);
                    } catch (e) {
                        // Error reading VFS file
                    }
                });
            } else if (event === 'delete') {
                this.cleanupDoc(path);
            }
        });
    }

    public lockFileForAi(path: string) {
        this.aiLocks.add(path);
    }

    public unlockFileForAi(path: string) {
        this.aiLocks.delete(path);
        // Force sync VFS to Yjs after AI is done
        this.syncLock = this.syncLock.then(async () => {
            try {
                const content = await vfs.readFile(path);
                this.syncVfsToYjs(path, content);
            } catch (e) {}
        });
    }

    public isFileLockedByAi(path: string): boolean {
        return this.aiLocks.has(path);
    }

    private initWorker() {
        this.worker = new Worker(new URL('../workers/yjs.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e) => {
            const { type, path, update } = e.data;
            if (type === 'update' && this.docs.has(path) && update) {
                const doc = this.docs.get(path)!;
                Y.applyUpdate(doc, update, 'worker');
            }
        };
    }

    public static getInstance(): YjsService {
        if (!YjsService.instance) {
            YjsService.instance = new YjsService();
        }
        return YjsService.instance;
    }

    public setProjectId(id: string) {
        if (this.projectId !== id) {
            this.cleanupAll();
            this.projectId = id;
        }
    }

    public getDoc(path: string): Y.Doc {
        if (!this.projectId) throw new Error("Project ID not set in YjsService");

        if (this.docs.has(path)) {
            return this.docs.get(path)!;
        }

        const doc = new Y.Doc();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const roomSuffix = safeStorage.getItem(`ham_room_${this.projectId}_${path}`) || Math.random().toString(36).substring(7);
        safeStorage.setItem(`ham_room_${this.projectId}_${path}`, roomSuffix);

        // We still need a local provider for awareness (cursor tracking)
        // But the actual heavy syncing is done by the worker
        const awarenessDoc = new Y.Doc();
        const provider = new WebsocketProvider(
            `${protocol}//${host}/collab`,
            `${this.projectId}-${path}-${roomSuffix}`,
            awarenessDoc,
            {
                maxBackoffTime: 2500,
                resyncInterval: 5000
            }
        );

        // Set local user awareness
        provider.awareness.setLocalStateField('user', {
            name: 'User ' + Math.floor(Math.random() * 1000),
            color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
        });

        const textType = doc.getText('monaco');

        // Listen for remote changes and sync back to VFS
        textType.observe((event, transaction) => {
            if (transaction.local) return; // Ignore local changes (already in VFS or editor)
            if (this.isSyncing) return; // Prevent infinite loops

            // Debounce VFS writes to prevent thrashing
            this.scheduleVfsWrite(path, textType.toString());
        });

        // Sync local updates to worker
        doc.on('update', (update: Uint8Array, origin: any) => {
            if (origin !== 'worker' && this.worker) {
                this.worker.postMessage({ type: 'update', path, update });
            }
        });

        if (this.worker) {
            this.worker.postMessage({
                type: 'init',
                path,
                projectId: this.projectId,
                roomSuffix,
                host: window.location.host,
                protocol
            });
        }

        this.docs.set(path, doc);
        this.providers.set(path, provider);

        return doc;
    }

    public getProvider(path: string): WebsocketProvider | undefined {
        return this.providers.get(path);
    }

    private syncVfsToYjs(path: string, content: string) {
        if (!this.docs.has(path)) return; // Only sync if doc is active
        
        this.isSyncing = true;
        try {
            const doc = this.docs.get(path)!;
            const textType = doc.getText('monaco');
            const currentText = textType.toString();
            
            if (currentText !== content) {
                // Proper diffing to preserve cursors and history
                const changes = diffChars(currentText, content);
                let index = 0;
                doc.transact(() => {
                    changes.forEach(change => {
                        if (change.added) {
                            textType.insert(index, change.value);
                            index += change.value.length;
                        } else if (change.removed) {
                            textType.delete(index, change.value.length);
                        } else {
                            index += change.value.length;
                        }
                    });
                }, 'vfs');
            }
        } finally {
            this.isSyncing = false;
        }
    }

    private writeTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

    private scheduleVfsWrite(path: string, content: string) {
        if (this.writeTimeouts.has(path)) {
            clearTimeout(this.writeTimeouts.get(path));
        }
        
        this.writeTimeouts.set(path, setTimeout(() => {
            this.syncLock = this.syncLock.then(async () => {
                try {
                    await vfs.writeFile(path, content, 'yjs');
                } catch (e) {
                    // Ignore write errors
                }
            });
            this.writeTimeouts.delete(path);
        }, 500)); // 500ms debounce
    }

    public cleanupDoc(path: string) {
        if (this.writeTimeouts.has(path)) {
            clearTimeout(this.writeTimeouts.get(path));
            this.writeTimeouts.delete(path);
        }
        if (this.worker) {
            this.worker.postMessage({ type: 'cleanup', path });
        }
        const provider = this.providers.get(path);
        if (provider) provider.destroy();
        this.providers.delete(path);

        const doc = this.docs.get(path);
        if (doc) doc.destroy();
        this.docs.delete(path);
    }

    public cleanupAll() {
        this.writeTimeouts.forEach(timeout => clearTimeout(timeout));
        this.writeTimeouts.clear();
        if (this.worker) {
            this.worker.postMessage({ type: 'cleanupAll' });
        }
        this.providers.forEach(p => p.destroy());
        this.docs.forEach(d => d.destroy());
        this.providers.clear();
        this.docs.clear();
    }
}

export const yjsService = YjsService.getInstance();
