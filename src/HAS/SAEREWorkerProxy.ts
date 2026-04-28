 
/**
 * SAEREWorkerProxy.ts
 * Bridge communication between Main Thread and SAERE Worker Thread.
 */

export class SAEREWorkerProxy {
  private static worker: Worker | null = null;

  static getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./workers/has.worker.ts', import.meta.url), {
        type: 'module'
      });

      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;

        if (type === 'SAERE_NOTIFICATION') {
          window.dispatchEvent(new CustomEvent('saere-notification', { detail: payload }));
        }

        if (type === 'SAERE_LOG') {
          this.handleLog(payload);
        }

        if (type === 'WRITE_FILE_REQUEST') {
          const { path, content } = payload;
          this.handleWriteFile(path, content);
        }
      };

      this.worker.onerror = (e) => {
        console.error('[SAERE_PROXY] Worker error:', e);
      };
    }
    return this.worker;
  }

  private static async handleLog(log: string) {
    console.log(`[SAERE_LOG] ${log}`);
    
    let targetFile = '.saere/logs/general.log';
    if (log.includes('[DECISION_LOG]')) targetFile = 'SAERE_DECISION_LOG.md';
    if (log.includes('[EVOLUTION_PROPOSAL]')) targetFile = 'SAERE_EVOLUTION.md';
    if (log.includes('[CIRCUIT_FAILURE]')) targetFile = 'error_log.md';
    
    // Append to file via VFS
    import('../services/vfsService').then(m => {
      m.vfs.appendFile(targetFile, log + '\n').catch(err => {
        console.error(`[SAERE_PROXY] Failed to write log to ${targetFile}`, err);
      });
    });
  }

  private static async handleWriteFile(path: string, content: string) {
    import('../services/vfsService').then(m => {
      m.vfs.writeFile(path, content).then(() => {
        console.log(`[SAERE_PROXY] Neural Link: Successfully wrote to ${path}`);
        window.dispatchEvent(new CustomEvent('saere-file-written', { detail: { path } }));
      }).catch(err => {
        console.error(`[SAERE_PROXY] Neural Link: Failed to write to ${path}`, err);
      });
    });
  }

  static sendError(payload: string) {
    this.getWorker().postMessage({ type: 'NEW_ERROR', payload });
  }

  static sendPerformanceSample(endpoint: string, durationMs: number) {
    this.getWorker().postMessage({ type: 'PERFORMANCE_SAMPLE', endpoint, durationMs });
  }

  static appendFile(path: string, content: string) {
    this.handleLog(`[MANUAL_APPEND] ${path}: ${content}`);
  }
}
