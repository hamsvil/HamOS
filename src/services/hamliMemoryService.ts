/* eslint-disable no-useless-assignment */
import { structuredDb, MemoryEntry } from '../db/structuredDb';
import { nativeBridge } from '../utils/nativeBridge';
import { resilienceEngine } from './ResilienceEngine';

export interface HamliMemory {
  static: MemoryEntry[];
  dynamic: MemoryEntry[];
}

const MEMORY_SYNC_CHANNEL = 'hamli_memory_sync';
const syncChannel = typeof globalThis !== 'undefined' && 'BroadcastChannel' in globalThis 
  ? new BroadcastChannel(MEMORY_SYNC_CHANNEL) 
  : null;

export const hamliMemoryService = {
  // Add listener for external updates
  onSync: (callback: () => void) => {
    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (event.data === 'update') {
          callback();
        }
      };
    } else if (typeof window !== 'undefined') {
      // Fallback to localStorage events for cross-tab sync
      window.addEventListener('storage', (event) => {
        if (event.key === MEMORY_SYNC_CHANNEL) {
          callback();
        }
      });
    }
  },

  _triggerSync: () => {
    if (syncChannel) {
      syncChannel.postMessage('update');
    } else if (typeof window !== 'undefined' && window.localStorage) {
      // Fallback to localStorage
      try {
        window.localStorage.setItem(MEMORY_SYNC_CHANNEL, Date.now().toString());
      } catch (e) {
        console.warn('Failed to trigger memory sync via localStorage:', e);
      }
    }
  },

  async getMemory(offset: number = 0, limit: number = 50): Promise<HamliMemory> {
    return await resilienceEngine.execute('GetHamliMemory', async () => {
      if (nativeBridge.isAvailable()) {
        try {
          const nativeMemory = nativeBridge.call('getHamliMemory');
          if (nativeMemory && typeof nativeMemory === 'string') {
            return JSON.parse(nativeMemory);
          }
        } catch (e) {
          console.error('Failed to fetch memory from Android:', e);
        }
      }
      const staticMem = await structuredDb.staticMemory.offset(offset).limit(limit).toArray();
      const dynamicMem = await structuredDb.dynamicMemory.offset(offset).limit(limit).toArray();
      return {
        static: staticMem || [],
        dynamic: dynamicMem || []
      };
    }, { static: [], dynamic: [] });
  },

  async addDynamicMemory(content: string, type: string = 'interaction'): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: `dyn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: Date.now()
    };
    
    return await resilienceEngine.execute(`AddDynamicMemory_${entry.id}`, async () => {
      await structuredDb.dynamicMemory.put(entry);
      if (nativeBridge.isAvailable()) {
        try {
          nativeBridge.call('saveHamliMemory', 'dynamic', content, type);
        } catch (e) {
          console.error('Failed to save dynamic memory to Android:', e);
        }
      }
      hamliMemoryService._triggerSync();
      return entry;
    });
  },

  async addStaticMemory(content: string, type: string = 'core_knowledge'): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: `stat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: Date.now()
    };
    
    return await resilienceEngine.execute(`AddStaticMemory_${entry.id}`, async () => {
      await structuredDb.staticMemory.put(entry);
      if (nativeBridge.isAvailable()) {
        try {
          nativeBridge.call('saveHamliMemory', 'static', content, type);
        } catch (e) {
          console.error('Failed to save static memory to Android:', e);
        }
      }
      hamliMemoryService._triggerSync();
      return entry;
    });
  },

  async deleteMemory(category: 'static' | 'dynamic', id: string): Promise<void> {
    return await resilienceEngine.execute(`DeleteMemory_${id}`, async () => {
      if (category === 'static') {
        await structuredDb.staticMemory.delete(id);
      } else {
        await structuredDb.dynamicMemory.delete(id);
      }
      hamliMemoryService._triggerSync();
    });
  },

  async searchMemory(query: string, category: 'all' | 'static' | 'dynamic' = 'all'): Promise<MemoryEntry[]> {
    const lowerQuery = query.toLowerCase();
    const filterFn = (item: MemoryEntry) => 
      item.content.toLowerCase().includes(lowerQuery) || 
      item.type.toLowerCase().includes(lowerQuery);

    let results: MemoryEntry[] = [];
    
    if (category === 'all' || category === 'static') {
      const staticResults = await structuredDb.staticMemory.filter(filterFn).toArray();
      results = [...results, ...staticResults];
    }
    
    if (category === 'all' || category === 'dynamic') {
      const dynamicResults = await structuredDb.dynamicMemory.filter(filterFn).toArray();
      results = [...results, ...dynamicResults];
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }
};
