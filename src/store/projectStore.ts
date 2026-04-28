/* eslint-disable no-useless-assignment */
import { create } from 'zustand';
import { ProjectData, ChatMessageData, AgentActivity, ProjectFile } from '../components/HamAiStudio/types';
import { vfs } from '../services/vfsService';
import { projectService } from '../services/projectService';
import { safeStorage } from '../utils/storage';
import { LoggerService } from '../services/LoggerService';

interface ProjectState {
  project: ProjectData | null;
  history: ChatMessageData[];
  activeView: 'chat' | 'preview' | 'dashboard';
  shadowBuffers: Record<string, string>;
  lockedLines: Record<string, number[]>;
  domTelemetry: any | null;
  previewErrors: string[];
  
  // UI State
  uiState: {
    isSidebarVisible: boolean;
    activeSidePanel: 'none' | 'packages' | 'git' | 'search' | 'terminal';
    isDeviceMonitorOpen: boolean;
    isAiLogOpen: boolean;
    isSideBySide: boolean;
    isCollaborationPanelOpen: boolean;
    isSettingsOpen: boolean;
    isHistoryOpen: boolean;
    isTemplateGalleryOpen: boolean;
    isExportManagerOpen: boolean;
    isAnalyticsDashboardOpen: boolean;
    isDatabaseVisualizerOpen: boolean;
    isLiveSessionOpen: boolean;
    isFullPreviewOpen: boolean;
    isDeploymentModalOpen: boolean;
    isNewProjectModalOpen: boolean;
    isMoreMenuOpen: boolean;
    isMarketplaceOpen: boolean;
    isDebuggerOpen: boolean;
    isCommandPaletteOpen: boolean;
    isApkBuilderOpen: boolean;
    isLocalMode: boolean;
    isManualPlanningOpen: boolean;
    isManualInstructionOpen: boolean;
    previewProject: ProjectData | null;
    tourStep: number | null;
    diffData: { path: string, oldContent: string, newContent: string } | null;
    breakpoints: Record<string, number[]>;
    isSyncing: boolean;
    syncStatus: 'idle' | 'syncing' | 'success';
    
    // New Studio UI State
    error: { title: string; message: string; } | null;
    localLlmReady: boolean;
    manualInstruction: string;
    useAgentic: boolean;
    isDeepScanning: boolean;
    aiLog: string[];
    customAgentActivities: AgentActivity[];
    
    // Project Manager State
    projectType: string;
    showWelcome: boolean;
    selectedFile: ProjectFile | null;
    webProjectUrl: string | null;
    showSuggestions: boolean;
    isResuming: boolean;
    isHamEngineV2Open: boolean;
  };

  // Actions
  setProject: (project: ProjectData | null) => void;
  setHistory: (history: ChatMessageData[] | ((prev: ChatMessageData[]) => ChatMessageData[])) => void;
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  setShadowBuffer: (path: string, content: string | null) => void;
  setLockedLines: (path: string, lines: number[]) => void;
  setDomTelemetry: (dom: any | null) => void;
  addPreviewError: (error: string) => void;
  clearPreviewErrors: () => void;
  setUiState: (uiState: Partial<ProjectState['uiState']>) => void;
  resetToSafeState: () => void;
  
  // Granular File Actions (Atomic Updates)
  updateFileContent: (path: string, content: string) => void;
  addFile: (path: string, content: string) => void;
  removeFile: (path: string) => void;
  
  // Persistence
  saveImmediately: (projectOverride?: ProjectData, historyOverride?: ChatMessageData[]) => Promise<void>;
  clearShadowBuffers: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  setProject: (project) => set({ project }),
  history: [],
  activeView: 'dashboard',
  shadowBuffers: {},
  lockedLines: {},
  domTelemetry: null,
  previewErrors: [],
  uiState: {
    isSidebarVisible: false,
    activeSidePanel: 'none',
    isDeviceMonitorOpen: false,
    isAiLogOpen: false,
    isSideBySide: false,
    isCollaborationPanelOpen: false,
    isSettingsOpen: false,
    isHistoryOpen: false,
    isTemplateGalleryOpen: false,
    isExportManagerOpen: false,
    isAnalyticsDashboardOpen: false,
    isDatabaseVisualizerOpen: false,
    isLiveSessionOpen: false,
    isFullPreviewOpen: false,
    isDeploymentModalOpen: false,
    isNewProjectModalOpen: false,
    isMoreMenuOpen: false,
    isMarketplaceOpen: false,
    isDebuggerOpen: false,
    isCommandPaletteOpen: false,
    isApkBuilderOpen: false,
    isLocalMode: false,
    isManualPlanningOpen: false,
    isManualInstructionOpen: false,
    previewProject: null,
    tourStep: null,
    diffData: null,
    breakpoints: {},
    isSyncing: false,
    syncStatus: 'idle',
    
    // Initial Studio UI State
    error: null,
    localLlmReady: false,
    manualInstruction: '',
    useAgentic: true,
    isDeepScanning: false,
    aiLog: [],
    customAgentActivities: [],
    
    // Initial Project Manager State
    projectType: 'apk',
    showWelcome: false,
    selectedFile: null,
    webProjectUrl: null,
    showSuggestions: true,
    isResuming: false,
    isHamEngineV2Open: false
  },

  setUiState: (uiState) => set((state) => ({ uiState: { ...state.uiState, ...uiState } })),
  
  setHistory: (historyUpdater) => set((state) => {
    const newHistory = typeof historyUpdater === 'function' ? historyUpdater(state.history) : historyUpdater;
    return { history: newHistory };
  }),
  
  setActiveView: (activeView) => set({ activeView }),

  setShadowBuffer: (path, content) => set((state) => {
    const newShadowBuffers = { ...state.shadowBuffers };
    if (content === null || content === '__DELETED__') {
      delete newShadowBuffers[path];
    } else {
      // LRU logic: if too many buffers, remove the oldest one (first key)
      const keys = Object.keys(newShadowBuffers);
      if (keys.length >= 100 && !newShadowBuffers[path]) {
        delete newShadowBuffers[keys[0]];
      }
      newShadowBuffers[path] = content;
    }
    
    // Emit event for WebContainer and Preview to sync shadow buffer changes
    if (typeof window !== 'undefined') {
        let emitContent = content;
        if (content === '__DELETED__') {
            emitContent = null;
        } else if (content === null) {
            emitContent = state.project?.files.find(f => f.path === path)?.content || null;
        }
        window.dispatchEvent(new CustomEvent('ham-file-changed', {
            detail: { path, content: emitContent, project: state.project }
        }));
        
        // Persist shadow buffers (debounced) with tab-concurrency protection
        if ((window as any)._shadowBufferTimeout) {
            clearTimeout((window as any)._shadowBufferTimeout);
        }
        (window as any)._shadowBufferTimeout = setTimeout(() => {
            try {
                // Multi-tab safety: Merge with existing storage if possible or use versioning
                const storageKey = `ham_shadow_buffers_${state.project?.id || 'default'}`;
                safeStorage.setItem(storageKey, JSON.stringify(newShadowBuffers));
            } catch (e) {
                console.warn("safeStorage quota exceeded for shadow buffers");
            }
        }, 800); // Increased debounce for stability

        // Add beforeunload listener to flush pending shadow buffers immediately
        if (!(window as any)._shadowBufferBeforeUnloadInitialized) {
          (window as any)._shadowBufferBeforeUnloadInitialized = true;
          window.addEventListener('beforeunload', () => {
            const currentState = useProjectStore.getState();
            const projectId = currentState.project?.id || 'default';
            const storageKey = `ham_shadow_buffers_${projectId}`;
            // Use sessionStorage as fallback/backup for immediate flush since localStorage might be async/blocked
            try {
              sessionStorage.setItem(storageKey, JSON.stringify(currentState.shadowBuffers));
              localStorage.setItem(storageKey, JSON.stringify(currentState.shadowBuffers));
            } catch (e) {
              // Ignore
            }
          });
        }
    }
    
    return { shadowBuffers: newShadowBuffers };
  }),

  setLockedLines: (path, lines) => set((state) => {
    const newLockedLines = { ...state.lockedLines };
    if (lines.length === 0) {
      delete newLockedLines[path];
    } else {
      newLockedLines[path] = lines;
    }
    return { lockedLines: newLockedLines };
  }),
  
  clearShadowBuffers: () => set((state) => {
    if (typeof window !== 'undefined') {
        try {
            safeStorage.removeItem(`ham_shadow_buffers_${state.project?.id || 'default'}`);
        } catch (e) {
            LoggerService.warn('ProjectStore', 'Failed to clear shadow buffers from safeStorage', e);
        }
    }
    return { shadowBuffers: {} };
  }),

  setDomTelemetry: (dom) => set({ domTelemetry: dom }),

  addPreviewError: (error) => set((state) => {
    // Check if the last message is already this error to avoid spam
    const lastMessage = state.history[state.history.length - 1];
    const isDuplicate = lastMessage && lastMessage.isError && lastMessage.content === error;
    
    if (isDuplicate) {
      return { previewErrors: [...(state.previewErrors || []), error].slice(-50) };
    }

    const errorMessage: ChatMessageData = {
      id: `err_${Date.now()}`,
      role: 'system',
      content: error,
      isError: true,
      timestamp: Date.now()
    };

    return {
      previewErrors: [...(state.previewErrors || []), error].slice(-50),
      history: [...(state.history || []), errorMessage].slice(-100)
    };
  }),

  clearPreviewErrors: () => set({ previewErrors: [] }),

  updateFileContent: (path, content) => set((state) => {
    if (!state.project) return state;
    const files = state.project.files;
    const fileIndex = files.findIndex(f => f.path === path);
    
    if (fileIndex === -1) return state;
    if (files[fileIndex].content === content) return state; // No change

    // Create a new array but keep object references for unchanged files
    const newFiles = [...files];
    newFiles[fileIndex] = { ...newFiles[fileIndex], content };
    
    return { project: { ...state.project, files: newFiles } };
  }),

  addFile: (path, content) => set((state) => {
    if (!state.project) return state;
    if (state.project.files.some(f => f.path === path)) return state;
    
    const newFiles = [...state.project.files, { path, content }];
    newFiles.sort((a, b) => a.path.localeCompare(b.path));
    
    return { project: { ...state.project, files: newFiles } };
  }),

  removeFile: (path) => set((state) => {
    if (!state.project) return state;
    const newFiles = state.project.files.filter(f => f.path !== path && !f.path.startsWith(`${path}/`));
    return { project: { ...state.project, files: newFiles } };
  }),

  saveImmediately: async (projectOverride?: ProjectData, historyOverride?: ChatMessageData[]) => {
    const { project, history } = get();
    const currentProject = projectOverride || project;
    const currentHistory = historyOverride || history;
    if (currentProject) {
      if (!currentProject.id) {
        currentProject.id = `proj_${Date.now()}`;
      }
      safeStorage.setItem('ham_last_active_project_id', currentProject.id);
      await projectService.saveProject({
        id: currentProject.id,
        name: currentProject.name || 'Untitled Project',
        timestamp: Date.now(),
        data: currentProject,
        chatHistory: currentHistory || []
      });
    }
  },

  resetToSafeState: () => {
    set({
      shadowBuffers: {},
      previewErrors: [],
      uiState: {
        ...get().uiState,
        error: null,
        isSyncing: false,
        syncStatus: 'idle'
      }
    });
    if (typeof window !== 'undefined') {
      try {
        const projectId = get().project?.id || 'default';
        safeStorage.removeItem(`ham_shadow_buffers_${projectId}`);
      } catch (e) {
        console.warn('Failed to clear shadow buffers during reset');
      }
    }
  }
}));

// Initialize VFS listener outside the component to prevent re-renders
let isVfsListenerInitialized = false;
let unsubscribeVfs: (() => void) | null = null;

export const initProjectStoreListener = () => {
  if (isVfsListenerInitialized) return;
  isVfsListenerInitialized = true;

  let writeTimeout: NodeJS.Timeout;
  const pendingWrites = new Map<string, string>();
  let isFlushing = false;

  const flushWrites = async (projectId: string) => {
      if (pendingWrites.size === 0 || isFlushing) return;
      isFlushing = true;
      
      try {
          const { NativeStorage } = await import('../plugins/NativeStorage');
          const { nativeBridge } = await import('../utils/nativeBridge');
          
          if (!nativeBridge.isAvailable()) {
              pendingWrites.clear();
              isFlushing = false;
              return;
          }
          
          let dataDirResult = { path: null };
          try {
              dataDirResult = await NativeStorage.getInternalDataDirectory();
          } catch (e) {
              LoggerService.warn('ProjectStore', 'Failed to get native internal data directory, falling back to web mode', e);
          }
          
          const { path: dataDir } = dataDirResult;
          if (!dataDir) {
              isFlushing = false;
              return;
          }

          const projectRoot = `${dataDir}/projects/${projectId}`;
          const entriesToProcess = Array.from(pendingWrites.entries());
          pendingWrites.clear(); // Clear only the ones we are processing
          
          if (!entriesToProcess || entriesToProcess.length === 0) {
              isFlushing = false;
              return;
          }

          const processChunks = async () => {
              try {
                  // Chunking to prevent blocking the native bridge
                  const CHUNK_SIZE = 10;
                  for (let i = 0; i < entriesToProcess.length; i += CHUNK_SIZE) {
                      const chunkEntries = (entriesToProcess || []).slice(i, i + CHUNK_SIZE);
                      const filesChunk = chunkEntries.map(([path, content]) => ({
                          path: `${projectRoot}/${path.startsWith('/') ? path.substring(1) : path}`,
                          data: content
                      }));
                      
                      try {
                          await NativeStorage.bulkWrite({ files: filesChunk });
                      } catch (e) {
                          console.error("Failed to write chunk to native storage", e);
                          // Restore chunks to pendingWrites for next retry, preserving retry logic
                          chunkEntries.forEach(([path, content]) => {
                              if (!pendingWrites.has(path)) pendingWrites.set(path, content);
                          });
                      }
                      // Yield to main thread
                      await new Promise(resolve => setTimeout(resolve, 50));
                  }
              } finally {
                  isFlushing = false;
                  if (pendingWrites.size > 0) {
                      flushWrites(projectId); // Flush any new writes that arrived during processing
                  }
              }
          };
          
          // Fire and forget, don't await
          processChunks();
      } catch (err) {
          console.error("Critical error in flushWrites:", err);
          isFlushing = false;
      }
  };

  unsubscribeVfs = vfs.subscribe(async (event, path?: string, source?: string) => {
      if (source === 'user') return; // Ignore user edits as they are already in state

      const store = useProjectStore.getState();
      
      if (path) {
          if (event === 'delete') {
              store.removeFile(path);
              
              // Sync delete to native storage
              if (source !== 'system_init') {
                  import('../plugins/NativeStorage').then(({ NativeStorage }) => {
                      import('../utils/nativeBridge').then(({ nativeBridge }) => {
                          if (nativeBridge.isAvailable()) {
                              NativeStorage.getInternalDataDirectory().then(({ path: dataDir }) => {
                                  if (dataDir) {
                                      const projectId = store.project?.id || 'default';
                                      const projectRoot = `${dataDir}/projects/${projectId}`;
                                      const fullPath = `${projectRoot}/${path.startsWith('/') ? path.substring(1) : path}`;
                                      
                                      NativeStorage.deleteFile({ path: fullPath }).catch(() => {
                                          NativeStorage.rmdir({ path: fullPath }).catch(e => LoggerService.error('ProjectStore', 'Failed to rmdir in native storage', e));
                                      });
                                  }
                              });
                          }
                      });
                  });
              }
          } else if (event === 'create' || event === 'update' || event === 'rename') {
              try {
                  // Ignore directories
                  if (path.endsWith('/')) return;
                  
                  const content = await vfs.readFile(path);
                  
                  if (!store.project) {
                      store.setProject({
                          id: `proj_${Date.now()}`,
                          name: 'New Project',
                          files: [{ path, content }]
                      });
                  } else {
                      const existingFile = store.project.files.find(f => f.path === path);
                      if (existingFile) {
                          if (existingFile.content !== content) {
                              store.updateFileContent(path, content);
                          }
                      } else {
                          store.addFile(path, content);
                      }
                      
                      // Save to IndexedDB (debounced)
                      if ((window as any)._projectSaveTimeout) {
                          clearTimeout((window as any)._projectSaveTimeout);
                      }
                      (window as any)._projectSaveTimeout = setTimeout(() => {
                          useProjectStore.getState().saveImmediately();
                      }, 1000);
                  }
                  
                  // Emit event for WebContainer and Preview
                  if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('ham-file-changed', {
                          detail: { path, content, project: useProjectStore.getState().project }
                      }));
                  }
                  
                  // Sync to native storage for AI edits (Debounced)
                  if (source !== 'system_init') {
                      pendingWrites.set(path, content);
                      clearTimeout(writeTimeout);
                      writeTimeout = setTimeout(() => flushWrites(store.project?.id || 'default'), 1000);
                      
                      // Point 1: Zero-Latency Context Sync
                      import('../services/aiWorkerService').then(({ AiWorkerService }) => {
                          AiWorkerService.updateContext();
                      });
                  }
              } catch (e: any) {
                  if (e.message?.includes('EISDIR') || e.message?.includes('ENOENT')) {
                      // Silently ignore directory reads or deleted files
                      return;
                  }
                  LoggerService.error('ProjectStore', 'Error reading VFS file for store sync', e);
              }
          }
      } else {
          // Full snapshot update
          try {
              const snapshot = await vfs.getProjectSnapshot();
              if (store.project) {
                  store.setProject({ ...store.project, files: snapshot.files });
              }
          } catch (e) {
              LoggerService.error('ProjectStore', 'Error getting VFS snapshot', e);
          }
      }
  });
};

export const cleanupProjectStoreListener = () => {
    if (unsubscribeVfs) {
        unsubscribeVfs();
        unsubscribeVfs = null;
    }
    isVfsListenerInitialized = false;
};
