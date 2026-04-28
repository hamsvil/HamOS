 
 
import { vfs } from './vfsService';
import { docParserService } from './docParserService';
import { massiveDb } from '../db/massiveDb';

import { useTaskStore } from '../store/taskStore';

export class VectorStore {
    private static instance: VectorStore;
    private worker: Worker | null = null;
    private messageIdCounter: number = 0;
    private pendingRequests: Map<number, { resolve: (val: any) => void, reject: (err: any) => void, taskId: string }> = new Map();
    private lastSyncMap: Map<string, number> = new Map();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private isSyncing: boolean = false;
    
    private constructor() {
        this.initWorker();
        vfs.subscribe((event, path, source) => this.handleVFSEvent(event, path, source));
    }

    private initWorker() {
        try {
            this.worker = new Worker(new URL('../workers/vectorStore.worker.ts', import.meta.url), { type: 'module' });
            this.worker.onmessage = async (e) => {
                const { id, type, payload, method, args } = e.data;
                
                if (type === 'DB_CALL') {
                    try {
                        const result = await (massiveDb as unknown)[method](...args);
                        this.worker!.postMessage({ id, type: 'DB_RESULT', payload: result });
                    } catch (err: any) {
                        this.worker!.postMessage({ id, type: 'DB_ERROR', payload: err.message });
                    }
                    return;
                }

                const req = this.pendingRequests.get(id);
                if (req) {
                    if (type === 'PROGRESS') {
                        useTaskStore.getState().updateTask(req.taskId, { 
                            name: payload.message, 
                            progress: payload.progress 
                        });
                    } else if (type === 'ERROR') {
                        useTaskStore.getState().updateTask(req.taskId, { 
                            status: 'error', 
                            name: `Error: ${payload}` 
                        });
                        req.reject(new Error(payload));
                        this.pendingRequests.delete(id);
                    } else {
                        useTaskStore.getState().updateTask(req.taskId, { 
                            status: 'completed', 
                            progress: 100,
                            name: 'Operation complete'
                        });
                        setTimeout(() => useTaskStore.getState().removeTask(req.taskId), 3000);
                        req.resolve(payload);
                        this.pendingRequests.delete(id);
                    }
                }
            };
            this.worker.onerror = (err) => {
                console.error('VectorStore Worker Error:', err);
                for (const [id, req] of this.pendingRequests.entries()) {
                    useTaskStore.getState().updateTask(req.taskId, { 
                        status: 'error', 
                        name: 'Worker encountered a fatal error' 
                    });
                    req.reject(new Error('Worker encountered a fatal error'));
                    this.pendingRequests.delete(id);
                }
            };
        } catch (e) {
            // Failed to initialize VectorStore Worker
        }
    }

    private async sendMessageToWorker(type: string, payload?: any, timeoutMs: number = 120000): Promise<unknown> {
        if (!this.worker) return Promise.resolve(null);
        
        const id = ++this.messageIdCounter;
        const taskId = await useTaskStore.getState().addTask({
            type: 'indexing',
            name: `Vector Store: ${type}`,
        });

        await useTaskStore.getState().updateTask(taskId, { status: 'running' });

        return new Promise((resolve, reject) => {
            // Add a timeout to prevent hanging Promises
            const timeoutId = setTimeout(() => {
                useTaskStore.getState().updateTask(taskId, { 
                    status: 'error', 
                    name: 'Worker timeout' 
                });
                this.pendingRequests.delete(id);
                reject(new Error(`Worker message timeout for type: ${type}`));
            }, timeoutMs);

            this.pendingRequests.set(id, { 
                resolve: (val) => { clearTimeout(timeoutId); resolve(val); }, 
                reject: (err) => { clearTimeout(timeoutId); reject(err); },
                taskId
            });
            this.worker!.postMessage({ id, type, payload });
        });
    }

    public destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.pendingRequests.forEach(req => req.reject(new Error('VectorStore destroyed')));
        this.pendingRequests.clear();
    }

    public static getInstance(): VectorStore {
        if (!VectorStore.instance) {
            VectorStore.instance = new VectorStore();
        }
        return VectorStore.instance;
    }

    public async addDocument(path: string, content: string) {
        await this.sendMessageToWorker('ADD_DOC', { path, content });
    }

    public async removeDocument(path: string) {
        await this.sendMessageToWorker('REMOVE_DOC', { path });
    }

    public async search(query: string, topK: number = 5): Promise<{ path: string, score: number }[]> {
        const result = await this.sendMessageToWorker('SEARCH', { query, topK });
        return (result as { path: string, score: number }[]) || [];
    }

    public async getDocuments(): Promise<{ path: string, metadata: any, timestamp: number }[]> {
        const result = await this.sendMessageToWorker('GET_DOCS');
        return (result as { path: string, metadata: any, timestamp: number }[]) || [];
    }

    public async getDocumentContent(path: string): Promise<string | null> {
        const result = await this.sendMessageToWorker('GET_DOC_CONTENT', { path });
        return result as string | null;
    }

    private async getFileContent(path: string): Promise<string> {
        const ext = path.split('.').pop()?.toLowerCase();
        const arrayBuffer = await vfs.readFileAsBuffer(path);

        if (ext === 'pdf') return await docParserService.parsePdf(arrayBuffer.buffer as ArrayBuffer);
        if (ext === 'docx') return await docParserService.parseDocx(arrayBuffer.buffer as ArrayBuffer);
        if (ext === 'xlsx') return await docParserService.parseXlsx(arrayBuffer.buffer as ArrayBuffer);
        
        return await vfs.readFile(path);
    }

    public async syncFromVFS() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        
        try {
            const snapshot = await vfs.getProjectSnapshot();
            const docsToSync: { path: string, content: string }[] = [];
            let updatedCount = 0;
            
            const currentPaths = new Set<string>();
            
            for (const file of snapshot.files) {
                if (file.path.match(/\.(ts|tsx|js|jsx|java|xml|json|md|pdf|docx|xlsx)$/)) {
                    currentPaths.add(file.path);
                    const lastModified = vfs.getLastModified(file.path);
                    const lastSync = this.lastSyncMap.get(file.path) || 0;
                    
                    if (lastModified > lastSync) {
                        try {
                            const content = await this.getFileContent(file.path);
                            docsToSync.push({ path: file.path, content });
                            this.lastSyncMap.set(file.path, lastModified);
                            updatedCount++;
                        } catch (e) {
                            console.warn(`[VectorStore] Failed to read ${file.path}:`, e);
                        }
                    }
                }
            }
            
            const pathsToRemove: string[] = [];
            for (const path of this.lastSyncMap.keys()) {
                if (!currentPaths.has(path)) {
                    pathsToRemove.push(path);
                    this.lastSyncMap.delete(path);
                }
            }
            
            for (const path of pathsToRemove) {
                await this.removeDocument(path);
            }
            
            if (docsToSync.length > 0) {
                await this.sendMessageToWorker('SYNC_DOCS', docsToSync);
            }
        } finally {
            this.isSyncing = false;
        }
    }

    private async handleVFSEvent(event: 'create' | 'update' | 'delete' | 'rename', path: string, source?: string) {
        if (!path.match(/\.(ts|tsx|js|jsx|java|xml|json|md|pdf|docx|xlsx)$/)) return;

        if (event === 'delete') {
            await this.removeDocument(path);
            this.lastSyncMap.delete(path);
        } else if (event === 'rename' && source) {
            await this.removeDocument(source);
            this.lastSyncMap.delete(source);
            try {
                const content = await this.getFileContent(path);
                await this.addDocument(path, content);
                this.lastSyncMap.set(path, Date.now());
            } catch (e) {}
        } else if (event === 'create' || event === 'update') {
            try {
                const content = await this.getFileContent(path);
                await this.addDocument(path, content);
                this.lastSyncMap.set(path, Date.now());
            } catch (e) {}
        }
    }
}

export const vectorStore = VectorStore.getInstance();
