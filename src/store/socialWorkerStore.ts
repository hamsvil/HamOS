import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Platform } from '../types/socialWorker';

interface SocialWorkerState {
  selectedPlatforms: Platform[];
  queueIds: string[];
  settings: {
    autopilot: boolean;
    interval: number;
    theme: 'light' | 'dark' | 'system';
  };
  setSelectedPlatforms: (platforms: Platform[]) => void;
  addToQueue: (id: string) => void;
  updateSettings: (settings: Partial<SocialWorkerState['settings']>) => void;
}

export const useSocialWorkerStore = create<SocialWorkerState>()(
  persist(
    (set) => ({
      selectedPlatforms: [],
      queueIds: [],
      settings: {
        autopilot: false,
        interval: 60,
        theme: 'system',
      },
      setSelectedPlatforms: (platforms) => set({ selectedPlatforms: platforms }),
      addToQueue: (id) => set((state) => ({ queueIds: [...state.queueIds, id] })),
      updateSettings: (newSettings) => set((state) => ({ 
        settings: { ...state.settings, ...newSettings } 
      })),
    }),
    {
      name: 'social-worker-storage',
      partialize: (state) => ({
        selectedPlatforms: state.selectedPlatforms,
        queueIds: state.queueIds,
        settings: state.settings,
      }),
    }
  )
);
