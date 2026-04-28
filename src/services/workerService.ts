/* eslint-disable no-useless-assignment */
export class WorkerService {
  private static worker: Worker | null = null;
  private static nextId = 0;
  private static pendingTasks: Record<number, { resolve: (data: any) => void; reject: (err: any) => void }> = {};

  static getWorker() {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/fsWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const { id, type, payload } = e.data;
        if (this.pendingTasks[id]) {
          if (type.endsWith('_SUCCESS')) {
            this.pendingTasks[id].resolve(payload);
          } else if (type === 'ERROR') {
            this.pendingTasks[id].reject(new Error(payload));
          }
          delete this.pendingTasks[id];
        }
      };
    }
    return this.worker;
  }

  static runTask(type: string, payload: any): Promise<unknown> {
    const id = this.nextId++;
    const worker = this.getWorker();
    return new Promise((resolve, reject) => {
      this.pendingTasks[id] = { resolve, reject };
      worker.postMessage({ id, type, payload });
    });
  }
}
