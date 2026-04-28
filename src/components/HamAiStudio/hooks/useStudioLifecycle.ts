 
import { useEffect, useCallback } from 'react';
import { useProjectState } from './useProjectState';
import { useToast } from '../../../context/ToastContext';
import { vfs } from '../../../services/vfsService';
import { NativeStorage } from '../../../plugins/NativeStorage';
import { nativeBridge } from '../../../utils/nativeBridge';
import { ProjectData, ChatMessageData, ProjectFile } from '../types';
import { useProjectStore } from '../../../store/projectStore';

export function useStudioLifecycle() {
  const { showToast } = useToast();
  const projectState = useProjectState();
  const projectType = useProjectStore(state => state.uiState.projectType);
  const showWelcome = useProjectStore(state => state.uiState.showWelcome);
  const selectedFile = useProjectStore(state => state.uiState.selectedFile);
  const webProjectUrl = useProjectStore(state => state.uiState.webProjectUrl);
  const showSuggestions = useProjectStore(state => state.uiState.showSuggestions);
  const isResuming = useProjectStore(state => state.uiState.isResuming);
  const setUiState = useProjectStore(state => state.setUiState);

  const setProjectType = (val: string) => setUiState({ projectType: val });
  const setShowWelcome = (val: boolean) => setUiState({ showWelcome: val });
  const setSelectedFile = (val: ProjectFile | null) => setUiState({ selectedFile: val });
  const setWebProjectUrl = (val: string | null) => setUiState({ webProjectUrl: val });
  const setShowSuggestions = (val: boolean) => setUiState({ showSuggestions: val });
  const setIsResuming = (val: boolean) => setUiState({ isResuming: val });

  const { saveImmediately } = projectState;

  const saveProjectToHistory = useCallback((project?: ProjectData, history?: ChatMessageData[]) => {
    return saveImmediately(project, history);
  }, [saveImmediately]);

  const saveCurrentState = useCallback(() => {
    saveImmediately();
  }, [saveImmediately]);

  const saveProjectToDevice = useCallback(async (project?: ProjectData) => {
    const projToSave = project || useProjectStore.getState().project;
    if (projToSave && projToSave.files) {
      try {
        const filesToSave = projToSave.files.map((file) => ({
          path: file.path.startsWith('/') ? file.path : `/${file.path}`,
          content: file.content
        }));
        
        // 1. Save to VFS (IndexedDB)
        await vfs.bulkWrite(filesToSave);
        
        // 2. Sync to Native Storage if available
        if (nativeBridge.isAvailable()) {
            const { path: dataDir } = await NativeStorage.getInternalDataDirectory();
            
            if (dataDir) {
                const projectId = projToSave.id || 'default';
                const projectRoot = `${dataDir}/projects/${projectId}`;
                
                // Clean up ghost files: read existing files and delete those not in projToSave
                try {
                    const getAllFiles = async (dirPath: string): Promise<string[]> => {
                        const { files } = await NativeStorage.readdir({ path: dirPath });
                        let allFiles: string[] = [];
                        for (const file of files) {
                            const fullPath = `${dirPath}/${file}`;
                            const stat = await NativeStorage.stat({ path: fullPath });
                            if (stat.isDirectory) {
                                allFiles = allFiles.concat(await getAllFiles(fullPath));
                            } else {
                                allFiles.push(fullPath);
                            }
                        }
                        return allFiles;
                    };
                    
                    const existingFiles = await getAllFiles(projectRoot);
                    const currentFilePaths = new Set(filesToSave.map(f => `${projectRoot}/${f.path.startsWith('/') ? f.path.substring(1) : f.path}`));
                    
                    const filesToDelete = existingFiles.filter(f => !currentFilePaths.has(f));
                    if (filesToDelete.length > 0) {
                        await NativeStorage.bulkDelete({ paths: filesToDelete });
                    }
                } catch (e) {
                    // Directory might not exist yet, ignore
                }
                
                const nativeFiles = filesToSave
                    .filter(f => f.content !== undefined && f.content !== null)
                    .map((f) => ({
                        path: `${projectRoot}/${f.path.startsWith('/') ? f.path.substring(1) : f.path}`,
                        data: f.content || ""
                    }));
                
                await NativeStorage.bulkWrite({ files: nativeFiles });
            } else {
                console.warn("Could not determine internal data directory, skipping native sync.");
            }
        }
        
      } catch (e: any) {
        console.error("Failed to save project to device", e);
        const msg = e instanceof Error ? e.message : String(e);
        showToast(`Gagal menyimpan proyek: ${msg}`, "error");
      }
    }
  }, [showToast]);

  // Wrapper for compatibility with existing code
  return {
    generatedProject: projectState.project,
    setGeneratedProject: projectState.setProject,
    history: projectState.history,
    setHistory: projectState.setHistory,
    activeView: projectState.activeView,
    setActiveView: projectState.setActiveView,
    
    projectType, setProjectType,
    showWelcome, setShowWelcome,
    selectedFile, setSelectedFile,
    webProjectUrl, setWebProjectUrl,
    showSuggestions, setShowSuggestions,
    
    // Mock functions for compatibility if needed
    saveProjectToHistory,
    saveCurrentState,
    saveImmediately,
    saveProjectToDevice,
    isResuming: false,
    setIsResuming: () => {}
  };
}
