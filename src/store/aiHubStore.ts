/* eslint-disable no-useless-assignment */
import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { ChatMessage, SelectedFile, ChatSession } from '../types/ai';
import { CLONES } from '../constants/aiClones';

// Custom storage for IndexedDB using idb-keyval (Structured Cloning)
const idbStorage: PersistStorage<any> = {
  getItem: async (name: string): Promise<any> => {
    try {
      const val = await get(name);
      return val || null;
    } catch (e) {
      console.error('[AIHubStore] IDB Get Error:', e);
      return null;
    }
  },
  setItem: async (name: string, value: any): Promise<void> => {
    try {
      // Point 15: Structured Cloning Guard
      // Remove non-serializable objects like React Components or Symbols
      const cleanValue = JSON.parse(JSON.stringify(value, (key, val) => {
        if (typeof val === 'function') return undefined;
        if (val && typeof val === 'object' && val.$$typeof) return undefined; // React elements
        return val;
      }));
      await set(name, cleanValue);
    } catch (e) {
      console.error('[AIHubStore] IDB Set Error (Cloning?):', e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name).catch(() => {});
  },
};

export type EngineStatus = 'pending' | 'initializing' | 'ready' | 'error';

interface AIHubState {
  sessions: ChatSession[];
  currentSessionId: string;
  history: ChatMessage[];
  selectedFiles: SelectedFile[];
  isLoading: boolean;
  activeClone: typeof CLONES[0];
  lastError: string | null;
  engineStatuses: Record<string, EngineStatus>;
  
  // Actions
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSessionId: (id: string) => void;
  setHistory: (history: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setSelectedFiles: (files: SelectedFile[] | ((prev: SelectedFile[]) => SelectedFile[])) => void;
  setIsLoading: (isLoading: boolean) => void;
  setActiveClone: (clone: typeof CLONES[0]) => void;
  setLastError: (error: string | null) => void;
  setEngineStatus: (id: string, status: EngineStatus) => void;
  
  // Session Management
  createNewSession: () => string;
  deleteSession: (id: string) => void;
  clearAllHistory: () => void;

  // Snapshot for rollback
  snapshot: ChatMessage[] | null;
  takeSnapshot: () => void;
  rollback: () => void;
}

export const useAIHubStore = create<AIHubState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: 'default',
      history: [],
      selectedFiles: [],
      isLoading: false,
      activeClone: CLONES.find(c => c.id === 'hamli') || CLONES[0],
      lastError: null,
      engineStatuses: CLONES.reduce((acc, clone) => {
        acc[clone.id] = 'pending';
        return acc;
      }, {} as Record<string, EngineStatus>),
      
      setSessions: (sessions) => set({ sessions }),
      setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
      setHistory: (history) => set((state) => ({ 
        history: typeof history === 'function' ? history(state.history) : history 
      })),
      setSelectedFiles: (selectedFiles) => set((state) => ({ 
        selectedFiles: typeof selectedFiles === 'function' ? selectedFiles(state.selectedFiles) : selectedFiles 
      })),
      setIsLoading: (isLoading) => set({ isLoading }),
      setActiveClone: (activeClone) => set({ activeClone }),
      setLastError: (lastError) => set({ lastError }),
      setEngineStatus: (id, status) => set((state) => ({
        engineStatuses: { ...state.engineStatuses, [id]: status }
      })),
      
      createNewSession: () => {
        const newId = crypto.randomUUID();
        const newSession: ChatSession = {
          id: newId,
          title: 'Percakapan Baru',
          timestamp: Date.now(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newId,
          history: [],
        }));
        return newId;
      },

      deleteSession: (id) => {
        set((state) => {
          const newSessions = state.sessions.filter(s => s.id !== id);
          const isDeletingCurrent = state.currentSessionId === id;
          
          if (newSessions.length === 0) {
            const newId = crypto.randomUUID();
            const defaultSession: ChatSession = {
              id: newId,
              title: 'Percakapan Baru',
              timestamp: Date.now(),
            };
            return {
              sessions: [defaultSession],
              currentSessionId: newId,
              history: [],
            };
          }

          return {
            sessions: newSessions,
            currentSessionId: isDeletingCurrent ? newSessions[0].id : state.currentSessionId,
            history: isDeletingCurrent ? [] : state.history, // History will be reloaded by the session hook if needed
          };
        });
      },

      clearAllHistory: () => {
        const newId = crypto.randomUUID();
        const defaultSession: ChatSession = {
          id: newId,
          title: 'Percakapan Baru',
          timestamp: Date.now(),
        };
        set({ 
          sessions: [defaultSession], 
          currentSessionId: newId, 
          history: [] 
        });
      },

      snapshot: null,
      takeSnapshot: () => set({ snapshot: get().history }),
      rollback: () => {
        const { snapshot } = get();
        if (snapshot) {
          set({ history: snapshot, snapshot: null });
        }
      },
    }),
    {
      name: 'ai-hub-storage',
      storage: idbStorage,
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        history: state.history,
        activeClone: state.activeClone,
      }),
    }
  )
);
