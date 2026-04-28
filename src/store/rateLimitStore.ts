import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { getValidGeminiKeys } from '../config/hardcodedKeys';
import { get, set, del } from 'idb-keyval';

// Custom storage for IndexedDB using idb-keyval
const idbStorage: PersistStorage<any> = {
  getItem: async (name: string): Promise<any> => {
    if (typeof window === 'undefined') return null;
    try {
        const val = await get(name);
        return val || null;
    } catch (_) { return null; }
  },
  setItem: async (name: string, value: any): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        await set(name, value);
    } catch (_) { /* ignore storage errors in restricted envs */ }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        await del(name);
    } catch (_) { /* ignore */ }
  },
};

interface RateLimitState {
  usedRequests: number;
  lastResetTime: number;
  maxRequestsPerKey: number;
  
  // Actions
  recordRequest: () => void;
  checkAndResetDaily: () => void;
  getRemainingRequests: () => number;
  getRemainingPercentage: () => number;
  getMaxRequests: () => number;
}

export const useRateLimitStore = create<RateLimitState>()(
  persist(
    (setFn, getFn) => ({
      usedRequests: 0,
      lastResetTime: Date.now(),
      maxRequestsPerKey: 1500, // 1500 per day for free tier gemini

      recordRequest: () => {
        getFn().checkAndResetDaily();
        setFn((state) => ({ usedRequests: state.usedRequests + 1 }));
      },

      checkAndResetDaily: () => {
        const now = new Date();
        const lastReset = new Date(getFn().lastResetTime);
        
        // Reset at 5 AM local time
        const resetTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0, 0);
        
        // If it's passed 5 AM today, and last reset was before 5 AM today
        if (now >= resetTimeToday && lastReset < resetTimeToday) {
          setFn({ usedRequests: 0, lastResetTime: now.getTime() });
          console.log('[RateLimitStore] Daily reset (5 AM) performed.');
        }
      },

      getMaxRequests: () => {
        const fallbackKeys = getValidGeminiKeys();
        
        // Count keys from env GEMINI_API_KEY_1 to _8
        let envKeysCount = 0;
        for (let i = 1; i <= 8; i++) {
          if (process.env[`GEMINI_API_KEY_${i}`]) {
            envKeysCount++;
          }
        }

        // Add global GEMINI_API_KEY if present and not already counted
        if (process.env.GEMINI_API_KEY) {
          // We assume this is a general fallback
          envKeysCount = Math.max(envKeysCount, 1);
        }

        // Filter and deduplicate fallback keys
        const totalKeys = Math.max(envKeysCount, fallbackKeys.length, 1); 
        return totalKeys * getFn().maxRequestsPerKey;
      },

      getRemainingRequests: () => {
        const remaining = getFn().getMaxRequests() - getFn().usedRequests;
        return Math.max(0, remaining);
      },

      getRemainingPercentage: () => {
        const max = getFn().getMaxRequests();
        const remaining = Math.max(0, max - getFn().usedRequests);
        const percentage = (remaining / max) * 100;
        return Math.max(0, Math.min(100, Math.round(percentage)));
      }
    }),
    {
      name: 'ham-rate-limit-storage',
      storage: idbStorage,
      skipHydration: typeof window === 'undefined'
    }
  )
);
