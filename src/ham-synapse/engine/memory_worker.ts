 
import { HamEvent } from '../core/types';

class MemoryWorker {
  private memory: any[] = [];

  append(event: HamEvent) {
    this.memory.push(event);
  }

  getMemory() {
    return this.memory;
  }

  async queryContext(tags: string[]): Promise<any[]> {
    return this.memory.filter(m => tags.some(t => m.payload?.tags?.includes(t)));
  }
}

export const memoryWorker = new MemoryWorker();
