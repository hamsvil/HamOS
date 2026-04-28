import * as fs from 'fs';
import * as path from 'path';

export interface BatchResult<T> {
  item: T;
  result?: any;
  error?: any;
}

const LOCK_DIR = path.resolve(process.cwd(), '.lisa/locks');

export class BatchProcessor {
  constructor() {
    if (!fs.existsSync(LOCK_DIR)) {
      fs.mkdirSync(LOCK_DIR, { recursive: true });
    }
  }

  public async processBatch<T>(
    items: T[],
    handler: (item: T) => Promise<any>,
    concurrency = 3
  ): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];
    const queue = [...items];
    const running: Promise<void>[] = [];

    const runOne = async (item: T) => {
      try {
        const res = await handler(item);
        results.push({ item, result: res });
      } catch (e: any) {
        results.push({ item, error: e.message });
      }
    };

    while (queue.length > 0) {
      while (running.length < concurrency && queue.length > 0) {
        const item = queue.shift()!;
        const p = runOne(item).then(() => {
          running.splice(running.indexOf(p), 1);
        });
        running.push(p);
      }
      if (running.length >= concurrency) {
        await Promise.race(running);
      }
    }
    await Promise.all(running);
    return results;
  }

  public async acquireLock(filename: string, timeoutMs = 5000): Promise<boolean> {
    const lockPath = path.join(LOCK_DIR, `${filename}.lock`);
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        if (!fs.existsSync(lockPath)) {
          fs.writeFileSync(lockPath, process.pid.toString());
          return true;
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 200));
    }
    return false;
  }

  public releaseLock(filename: string) {
    const lockPath = path.join(LOCK_DIR, `${filename}.lock`);
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  }
}

export const batchProcessor = new BatchProcessor();
