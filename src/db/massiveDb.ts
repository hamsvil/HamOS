 
export class MassiveDatabase {
  private worker: Worker | null = null;
  private isInitialized = false;
  private messageIdCounter = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

  async init() {
    if (this.isInitialized) return;
    return new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(new URL('../workers/massiveDb.worker.ts', import.meta.url), { type: 'module' });
        
        this.worker.onmessage = (e) => {
          const { id, type, payload } = e.data;
          
          if (type === 'INIT_SUCCESS') {
            this.isInitialized = true;
            resolve();
            return;
          }
          
          if (type === 'ERROR' && id === undefined) {
            reject(new Error(payload));
            return;
          }
          
          const req = this.pendingRequests.get(id);
          if (req) {
            if (type === 'ERROR') {
              req.reject(new Error(payload));
            } else {
              req.resolve(payload);
            }
            this.pendingRequests.delete(id);
          }
        };
        this.worker.onerror = (err) => {
          console.error('MassiveDb Worker Error:', err);
          reject(new Error('Worker encountered a fatal error'));
          for (const [id, req] of this.pendingRequests.entries()) {
            req.reject(new Error('Worker encountered a fatal error'));
            this.pendingRequests.delete(id);
          }
        };
        
        this.worker.postMessage({ type: 'INIT' });
      } catch (err) {
        console.error('Failed to initialize SQLite WASM Worker', err);
        reject(err);
      }
    });
  }

  async destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.pendingRequests.forEach(req => req.reject(new Error('MassiveDatabase destroyed')));
    this.pendingRequests.clear();
  }

  private async sendMessage(type: string, payload?: any): Promise<any> {
    if (!this.worker) throw new Error('Worker not initialized');
    return new Promise((resolve, reject) => {
      const id = ++this.messageIdCounter;
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, payload });
    });
  }

  async insertEmbedding(id: string, content: string, embeddingArray: Float32Array, metadata: any) {
    return this.sendMessage('INSERT_EMBEDDING', { docId: id, content, embeddingArray, metadata });
  }

  async batchInsertEmbeddings(items: { docId: string, content: string, embeddingArray: Float32Array, metadata: any }[]) {
    return this.sendMessage('BATCH_INSERT_EMBEDDINGS', { items });
  }
  
  async getAllEmbeddings() {
    return this.sendMessage('GET_ALL_EMBEDDINGS');
  }

  async deleteEmbedding(id: string) {
    return this.sendMessage('DELETE_EMBEDDING', { docId: id });
  }

  async pruneOldEmbeddings(limit: number) {
    return this.sendMessage('PRUNE_OLD_EMBEDDINGS', { limit });
  }

  async getAllDocMetadata(): Promise<{ id: string, metadata: any, timestamp: number }[]> {
    return this.sendMessage('GET_ALL_DOC_METADATA');
  }

  async setAstCache(filePath: string, astJson: string, hash: string) {
    return this.sendMessage('SET_AST_CACHE', { filePath, astJson, hash });
  }

  async getAstCache(filePath: string): Promise<{ astJson: string, hash: string } | null> {
    return this.sendMessage('GET_AST_CACHE', { filePath });
  }

  async insertRelationship(docIdA: string, docIdB: string, type: string, score: number = 1.0) {
    return this.sendMessage('INSERT_RELATIONSHIP', { docIdA, docIdB, type, score });
  }

  async getRelatedDocs(docId: string): Promise<{ docId: string, type: string }[]> {
    return this.sendMessage('GET_RELATED_DOCS', { docId });
  }
}

export const massiveDb = new MassiveDatabase();
