/* eslint-disable no-useless-assignment */
import { Content } from '@google/genai';
import { vfs } from '../../vfsService';
import { HamState } from './types';

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
 * STATE PERSISTER V2.0
 * Manages atomic persistence of Ham Engine state and history.
 */
export class StatePersister {
  private readonly STATE_FILE = '.ham/state.json';
  private readonly TEMP_FILE = '.ham/state.tmp.json';
  private mutex = new AsyncMutex();

  public async checkUnfinishedTask(projectName: string): Promise<string | null> {
    return await this.mutex.runExclusive(async () => {
      try {
        if (await vfs.exists(this.STATE_FILE)) {
          const data = await vfs.readFile(this.STATE_FILE);
          const parsed = JSON.parse(data);
          if (parsed.state?.currentProject === projectName && !parsed.state.isFinished && parsed.state.currentTask) {
            return parsed.state.currentTask;
          }
        }
      } catch (e) {
        console.warn('[STATE PERSISTER] Check failed:', e);
      }
      return null;
    });
  }

  public async restoreState(projectName: string, currentState: HamState, history: Content[]): Promise<{ state: HamState, history: Content[] }> {
    return await this.mutex.runExclusive(async () => {
      try {
        if (await vfs.exists(this.STATE_FILE)) {
          const data = await vfs.readFile(this.STATE_FILE);
          const parsed = JSON.parse(data);
          
          if (parsed.state && parsed.history && parsed.state.currentProject === projectName) {
            const newState = { ...currentState, ...parsed.state };
            const existingHashes = new Set(history.map(h => this.hashContent(h)));
            const mergedHistory = [...history];

            for (const h of parsed.history) {
              if (!existingHashes.has(this.hashContent(h))) {
                mergedHistory.push(h);
              }
            }
            
            return { 
              state: newState, 
              history: this.optimizeHistory(mergedHistory) 
            };
          }
        }
      } catch (e) {
        console.warn('[STATE PERSISTER] Restore failed:', e);
      }
      return { state: currentState, history };
    });
  }

  private persistTimeout: NodeJS.Timeout | null = null;

  public async persistState(state: HamState, history: Content[]): Promise<void> {
    // Implement debounce to prevent disk saturation from frequent state updates
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }

    return new Promise((resolve) => {
      this.persistTimeout = setTimeout(async () => {
        await this.mutex.runExclusive(async () => {
          try {
            const data = JSON.stringify({ 
              state, 
              history: this.optimizeHistory(history),
              timestamp: Date.now()
            }, null, 2);

            // Atomic write: Write to temp then move
            await vfs.writeFile(this.TEMP_FILE, data);
            if (await vfs.exists(this.STATE_FILE)) {
              await vfs.deleteFile(this.STATE_FILE);
            }
            await vfs.rename(this.TEMP_FILE, this.STATE_FILE);
            resolve();
          } catch (e) {
            console.error('[STATE PERSISTER] Persist failed:', e);
            resolve();
          }
        });
      }, 2000);
    });
  }

  private hashContent(content: Content): string {
    return JSON.stringify(content.parts);
  }

  private optimizeHistory(history: Content[]): Content[] {
    const MAX_ITEMS = 300;
    const historyArray = Array.isArray(history) ? history : [];
    if (historyArray.length <= MAX_ITEMS) return historyArray;

    // Keep system/first message and last N messages
    const first = historyArray[0];
    let last = historyArray.slice(-MAX_ITEMS);

    // Ensure it starts with a user message for consistency
    while (last.length > 0 && last[0].role !== 'user') {
      last.shift();
    }

    // Ensure it doesn't end with an unanswered function call
    if (last.length > 0) {
      const final = last[last.length - 1];
      if (final.role === 'model' && final.parts?.some(p => p.functionCall)) {
        last.pop();
      }
    }

    return [first, ...last];
  }
}
