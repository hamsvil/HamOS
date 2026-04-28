/* eslint-disable no-useless-assignment */
import { vfs as virtualFS } from '../vfs';
import { LoggerService } from '../LoggerService';

export class VFSHealthCheck {
  private interval: NodeJS.Timeout | null = null;
  private readonly CORE_FILES = [
    '/src/workers/ai.worker.ts',
    '/src/services/vfsService.ts',
    '/src/services/hamEngine/utils.ts',
    '/src/services/aiWorkerService.ts'
  ];

  public start(reconcileFn: () => Promise<void>) {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(async () => {
      try {
        for (const file of this.CORE_FILES) {
          if (await virtualFS.exists(file)) {
            const content = await virtualFS.readFile(file);
            if (!content || content.length < 10) {
              LoggerService.error('VFS', `Health Check: Core file corrupted or empty: ${file}. Triggering reconciliation.`);
              await reconcileFn();
              break;
            }
          }
        }
      } catch (e) {
        LoggerService.error('VFS', 'Health Check failed.', e);
      }
    }, 120000);
  }

  public stop() {
    if (this.interval) clearInterval(this.interval);
  }

  public isCoreFile(path: string): boolean {
    return this.CORE_FILES.includes(path);
  }
}
