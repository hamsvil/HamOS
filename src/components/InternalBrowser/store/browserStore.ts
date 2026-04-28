 
import { create } from 'zustand';
import { structuredDb } from '../../../db/structuredDb';
import { BrowserDataSchema } from './schemas';
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { HamEventType } from '../../../ham-synapse/core/types';
import { nativeBridge } from '../../../utils/nativeBridge';

interface BrowserState {
  bookmarks: any[];
  history: any[];
  incognitoMode: boolean;
  addBookmark: (bookmark: any) => void;
  removeBookmark: (url: string) => void;
  isBookmarked: (url: string) => boolean;
  addToHistory: (entry: any) => void;
  clearHistory: () => Promise<void>;
  clearCache: () => Promise<void>;
  setIncognitoMode: (enabled: boolean) => void;
  loadData: () => Promise<void>;
}

// PROTOKOL: Anti-Race Condition (Debounced Native Sync)
let bookmarkSyncTimeout: any = null;
let historySyncTimeout: any = null;

const debouncedSyncBookmarks = (bookmarks: any[]) => {
  if (bookmarkSyncTimeout) clearTimeout(bookmarkSyncTimeout);
  bookmarkSyncTimeout = setTimeout(async () => {
    if (nativeBridge.isAvailable()) {
      try {
        await nativeBridge.callAsync('Android', 'syncBrowserBookmarks', JSON.stringify(bookmarks));
        hamEventBus.dispatch({ id: `log_${Date.now()}`, type: HamEventType.BROWSER_STATE, timestamp: Date.now(), source: 'BROWSER', payload: { level: 'info', message: 'Synced bookmarks to native' } });
      } catch (e) {
        if (window.Android && window.Android.syncBrowserBookmarks) {
          window.Android.syncBrowserBookmarks(JSON.stringify(bookmarks));
        }
      }
    }
  }, 1000);
};

const debouncedSyncHistory = (history: any[]) => {
  if (historySyncTimeout) clearTimeout(historySyncTimeout);
  historySyncTimeout = setTimeout(async () => {
    if (nativeBridge.isAvailable()) {
      try {
        await nativeBridge.callAsync('Android', 'syncBrowserHistory', JSON.stringify(history));
        hamEventBus.dispatch({ id: `log_${Date.now()}`, type: HamEventType.BROWSER_STATE, timestamp: Date.now(), source: 'BROWSER', payload: { level: 'info', message: 'Synced history to native' } });
      } catch (e) {
        if (window.Android && window.Android.syncBrowserHistory) {
          window.Android.syncBrowserHistory(JSON.stringify(history));
        }
      }
    }
  }, 1000);
};

export const useBrowserStore = create<BrowserState>((set, get) => ({
  bookmarks: [],
  history: [],
  incognitoMode: false,
  
  setIncognitoMode: (enabled: boolean) => set({ incognitoMode: enabled }),
  
  loadData: async () => {
    let bookmarks = await structuredDb.browserBookmarks.toArray();
    let history = await structuredDb.browserHistory.toArray();
    
    // Sync with Native if available
    if (nativeBridge.isAvailable()) {
      try {
        const nativeHistoryRaw = await nativeBridge.callAsync('Android', 'getNativeBrowserHistory');
        const nativeBookmarksRaw = await nativeBridge.callAsync('Android', 'getNativeBrowserBookmarks');
        
        if (nativeHistoryRaw) {
          const nativeHistory = BrowserDataSchema.parse(typeof nativeHistoryRaw === 'string' ? JSON.parse(nativeHistoryRaw) : nativeHistoryRaw);
          if (nativeHistory.length > history.length) {
            for (const entry of nativeHistory) {
              const exists = await structuredDb.browserHistory.where('url').equals(entry.url).and(h => h.timestamp === entry.timestamp).first();
              if (!exists) await structuredDb.browserHistory.add(entry);
            }
            history = await structuredDb.browserHistory.toArray();
          }
        }
        
        if (nativeBookmarksRaw) {
          const nativeBookmarks = BrowserDataSchema.parse(typeof nativeBookmarksRaw === 'string' ? JSON.parse(nativeBookmarksRaw) : nativeBookmarksRaw);
          if (nativeBookmarks.length > bookmarks.length) {
            for (const bookmark of nativeBookmarks) {
              const exists = await structuredDb.browserBookmarks.where('url').equals(bookmark.url).first();
              if (!exists) await structuredDb.browserBookmarks.add(bookmark);
            }
            bookmarks = await structuredDb.browserBookmarks.toArray();
          }
        }
        hamEventBus.dispatch({ id: `log_${Date.now()}`, type: HamEventType.BROWSER_STATE, timestamp: Date.now(), source: 'BROWSER', payload: { level: 'info', message: 'Synced with native browser data' } });
      } catch (e) {
        console.error('Failed to sync with native browser data:', e);
        // Fallback
        if (window.Android && window.Android.getNativeBrowserHistory && window.Android.getNativeBrowserBookmarks) {
          try {
            const nativeHistoryRaw = window.Android.getNativeBrowserHistory();
            const nativeBookmarksRaw = window.Android.getNativeBrowserBookmarks();
            
            const nativeHistory = BrowserDataSchema.parse(JSON.parse(nativeHistoryRaw));
            const nativeBookmarks = BrowserDataSchema.parse(JSON.parse(nativeBookmarksRaw));
            
            if (nativeHistory.length > history.length) {
              for (const entry of nativeHistory) {
                const exists = await structuredDb.browserHistory.where('url').equals(entry.url).and(h => h.timestamp === entry.timestamp).first();
                if (!exists) await structuredDb.browserHistory.add(entry);
              }
              history = await structuredDb.browserHistory.toArray();
            }
            
            if (nativeBookmarks.length > bookmarks.length) {
              for (const bookmark of nativeBookmarks) {
                const exists = await structuredDb.browserBookmarks.where('url').equals(bookmark.url).first();
                if (!exists) await structuredDb.browserBookmarks.add(bookmark);
              }
              bookmarks = await structuredDb.browserBookmarks.toArray();
            }
          } catch (err) {
            console.error('Fallback sync failed:', err);
          }
        }
      }
    }
    
    set({ bookmarks, history: history.sort((a, b) => b.timestamp - a.timestamp) });
  },

  addBookmark: async (bookmark) => {
    if (get().incognitoMode) return;
    const newBookmark = { ...bookmark, timestamp: Date.now() };
    await structuredDb.browserBookmarks.add(newBookmark);
    const bookmarks = await structuredDb.browserBookmarks.toArray();
    
    // Sync to Native (Debounced)
    debouncedSyncBookmarks(bookmarks);
    
    set({ bookmarks });
  },

  removeBookmark: async (url) => {
    if (get().incognitoMode) return;
    const bookmark = await structuredDb.browserBookmarks.where('url').equals(url).first();
    if (bookmark && bookmark.id) {
      await structuredDb.browserBookmarks.delete(bookmark.id);
    }
    const bookmarks = await structuredDb.browserBookmarks.toArray();
    
    // Sync to Native (Debounced)
    debouncedSyncBookmarks(bookmarks);
    
    set({ bookmarks });
  },

  isBookmarked: (url: string) => {
    return get().bookmarks.some(b => b.url === url);
  },

  addToHistory: async (entry) => {
    if (get().incognitoMode) return;
    const newEntry = { ...entry, timestamp: Date.now(), updatedAt: Date.now() };
    await structuredDb.browserHistory.add(newEntry);
    
    // Efficiently keep last 1000
    const count = await structuredDb.browserHistory.count();
    if (count > 1000) {
      const toDelete = await structuredDb.browserHistory.orderBy('timestamp').limit(count - 1000).toArray();
      for (const item of toDelete) {
        if (item.id) await structuredDb.browserHistory.delete(item.id);
      }
    }
    
    const updatedHistory = await structuredDb.browserHistory.orderBy('timestamp').reverse().toArray();
    
    // Sync to Native (Debounced)
    debouncedSyncHistory(updatedHistory);
    
    set({ history: updatedHistory });
  },

  clearHistory: async () => {
    await structuredDb.browserHistory.clear();
    
    // Sync to Native (Debounced)
    debouncedSyncHistory([]);
    
    set({ history: [] });
  },

  clearCache: async () => {
    await structuredDb.browserHistory.clear();
    await structuredDb.browserBookmarks.clear();
    
    // Sync to Native
    if (nativeBridge.isAvailable()) {
      try {
        await nativeBridge.callAsync('Android', 'clearNativeBrowserData');
        hamEventBus.dispatch({ id: `log_${Date.now()}`, type: HamEventType.BROWSER_STATE, timestamp: Date.now(), source: 'BROWSER', payload: { level: 'info', message: 'Cleared cache in native' } });
      } catch (e) {
        if (window.Android && window.Android.clearNativeBrowserData) {
          window.Android.clearNativeBrowserData();
        }
      }
    }
    
    set({ history: [], bookmarks: [] });
  },
}));
