import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppIconDefinition {
  id: string; // The activeTab ID
  originalName: string;
  customName?: string;
  iconName: string; // We'll map this string to a Lucide icon component in the UI
}

export const defaultApps: AppIconDefinition[] = [
  { id: 'browser', originalName: 'Quantum Browser', iconName: 'Globe' },
  { id: 'ham-aistudio', originalName: 'Ham AiStudio', iconName: 'Sparkles' },
  { id: 'memory', originalName: 'Lisa Memory', iconName: 'Brain' },
  { id: 'terminal', originalName: 'Terminal', iconName: 'Terminal' },
  { id: 'ai', originalName: 'AI Hub', iconName: 'Cpu' },
  { id: 'omni', originalName: 'Agent Worker', iconName: 'Bot' },
  { id: 'private-source', originalName: 'PrivateSource', iconName: 'Shield' },
  { id: 'tasks', originalName: 'Neural Tasks', iconName: 'Activity' },
  { id: 'synapse-vision', originalName: 'Synapse Vision', iconName: 'Eye' },
  { id: 'keygen', originalName: 'Key Gen', iconName: 'Key' }, 
  { id: 'agent-logs', originalName: 'Agent Logs', iconName: 'ScrollText' },
  { id: 'agent-results', originalName: 'Agent Results', iconName: 'FolderKanban' },
  { id: 'media-agent', originalName: 'Media Agent', iconName: 'Globe' }, 
  { id: 'h-camera', originalName: 'H Camera', iconName: 'Eye' }, 
  { id: 'generator-studio', originalName: 'Studio', iconName: 'Sparkles' }, 
  { id: 'sagent', originalName: 'Lisa Quantum Agent', iconName: 'Wifi' }, 
  { id: 'social-worker', originalName: 'Social Worker', iconName: 'Share2' },
  { id: 'aeterna', originalName: 'AeternaGlass', iconName: 'Glasses' },
  { id: 'feature-rules', originalName: 'Feature Rules', iconName: 'Shield' },
  { id: 'bug-hunter', originalName: 'Bug Hunter', iconName: 'Search' },
  { id: 'code-converter', originalName: 'Code Converter', iconName: 'Code' },
  { id: 'mesh-studio', originalName: 'Mesh Studio', iconName: 'Box' },
  { id: 'neural-pilot', originalName: 'Neural Pilot', iconName: 'Brain' },
  { id: 'refactor-worm', originalName: 'Refactor Worm', iconName: 'Wrench' },
  { id: 'vfs-mask', originalName: 'VFS Mask', iconName: 'Folder' },
  { id: 'voice-mirror', originalName: 'Voice Mirror', iconName: 'Mic' },
  { id: 'settings', originalName: 'Settings', iconName: 'Settings' }
];

interface AppDrawerState {
  apps: AppIconDefinition[];
  isOpen: boolean;
  isEditMode: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleDrawer: () => void;
  setIsEditMode: (editMode: boolean) => void;
  reorderApps: (newApps: AppIconDefinition[]) => void;
  renameApp: (id: string, newName: string) => void;
}

export const useAppDrawerStore = create<AppDrawerState>()(
  persist(
    (set) => ({
      apps: defaultApps,
      isOpen: false,
      isEditMode: false,
      setIsOpen: (isOpen) => set({ isOpen, isEditMode: false }), // Close edit mode when closing drawer
      toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen, isEditMode: false })),
      setIsEditMode: (isEditMode) => set({ isEditMode }),
      reorderApps: (newApps) => set({ apps: newApps }),
      renameApp: (id, newName) =>
        set((state) => ({
          apps: state.apps.map((app) =>
            app.id === id ? { ...app, customName: newName } : app
          ),
        })),
    }),
    {
      name: 'ham-app-drawer-storage',
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[HYDRATION ERROR] appDrawerStore:', error);
        }
      },
      // Only persist the 'apps' array to avoid opening drawer on reload
      partialize: (state) => ({ apps: state.apps }),
    }
  )
);
