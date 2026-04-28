import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProjectState {
  theme: 'dark' | 'light';
  layout: string;
  openTabs: string[];
  settings: Record<string, any>;
  setTheme: (theme: 'dark' | 'light') => void;
  setLayout: (layout: string) => void;
  setOpenTabs: (tabs: string[]) => void;
  updateSettings: (settings: Record<string, any>) => void;
  hydrate: (state: Partial<ProjectState>) => void;
}

export const useProjectStateStore = create<ProjectState>()(
  persist(
    (set) => ({
      theme: 'dark',
      layout: 'default',
      openTabs: [],
      settings: {},
      setTheme: (theme) => set({ theme }),
      setLayout: (layout) => set({ layout }),
      setOpenTabs: (tabs) => set({ openTabs: tabs }),
      updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
      hydrate: (state) => set((prev) => ({ ...prev, ...state })),
    }),
    {
      name: 'ham-ui-state',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[HYDRATION ERROR] projectState:', error);
        }
      },
      partialize: (state) => ({
        theme: state.theme,
        layout: state.layout,
        settings: state.settings,
        openTabs: state.openTabs,
      }),
    }
  )
);
