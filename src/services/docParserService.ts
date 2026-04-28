/* eslint-disable no-useless-assignment */
import { useTaskStore } from '../store/taskStore';

export class DocParserService {
  private worker: Worker;
  private messageIdCounter: number = 0;
  private pendingRequests: Map<number, { resolve: (val: any) => void, reject: (err: any) => void, accumulatedText: string, taskId: string }> = new Map();

  constructor() {
    this.worker = new Worker(new URL('../workers/docParser.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const { id, type, payload } = e.data;
      const req = this.pendingRequests.get(id);
      if (req) {
        if (type === 'PROGRESS') {
          useTaskStore.getState().updateTask(req.taskId, { 
            name: payload.message, 
            progress: payload.progress 
          });
        } else if (type === 'PARSE_CHUNK') {
          req.accumulatedText += payload;
        } else if (type === 'PARSE_SUCCESS') {
          useTaskStore.getState().updateTask(req.taskId, { 
            status: 'completed', 
            progress: 100,
            name: 'Parsing complete'
          });
          // Auto-remove after 3 seconds
          setTimeout(() => useTaskStore.getState().removeTask(req.taskId), 3000);
          req.resolve(payload || req.accumulatedText);
          this.pendingRequests.delete(id);
        } else if (type === 'ERROR') {
          useTaskStore.getState().updateTask(req.taskId, { 
            status: 'error', 
            name: `Error: ${payload}` 
          });
          req.reject(new Error(payload));
          this.pendingRequests.delete(id);
        }
      }
    };
    this.worker.onerror = (err) => {
      console.error('DocParser Worker Error:', err);
      // Reject all pending requests
      for (const [id, req] of this.pendingRequests.entries()) {
        useTaskStore.getState().updateTask(req.taskId, { 
          status: 'error', 
          name: 'Worker encountered a fatal error' 
        });
        req.reject(new Error('Worker encountered a fatal error'));
        this.pendingRequests.delete(id);
      }
    };
  }

  private async sendMessage(type: string, payload: any): Promise<any> {
    const id = ++this.messageIdCounter;
    const taskId = await useTaskStore.getState().addTask({
      type: 'parsing',
      name: 'Starting parser...',
    });
    await useTaskStore.getState().updateTask(taskId, { status: 'running' });
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, accumulatedText: '', taskId });
      this.worker.postMessage({ id, type, payload });
    });
  }

  public async parsePdf(arrayBuffer: ArrayBuffer): Promise<string> {
    return this.sendMessage('PARSE_PDF', { arrayBuffer });
  }

  public async parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
    return this.sendMessage('PARSE_DOCX', { arrayBuffer });
  }

  public async parseXlsx(arrayBuffer: ArrayBuffer): Promise<string> {
    return this.sendMessage('PARSE_XLSX', { arrayBuffer });
  }
}

export const docParserService = new DocParserService();
