 
// [STABILITY] Promise chains verified
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { ProjectData, ChatMessageData } from '../types';
import { useProjectStore, initProjectStoreListener, cleanupProjectStoreListener } from '../../../store/projectStore';
import { vfs } from '../../../services/vfsService';
import { projectService } from '../../../services/projectService';
import { safeStorage } from '../../../utils/storage';

// Modularized Hook: Handles Project State & Persistence
export function useProjectState() {
  const project = useProjectStore(state => state.project);
  const history = useProjectStore(state => state.history);
  const activeView = useProjectStore(state => state.activeView);
  
  const setProject = useProjectStore(state => state.setProject);
  const setHistory = useProjectStore(state => state.setHistory);
  const setActiveView = useProjectStore(state => state.setActiveView);
  const saveImmediately = useProjectStore(state => state.saveImmediately);

  const projectRef = useRef(project);
  const historyRef = useRef(history);

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { historyRef.current = history; }, [history]);

  // Initialize the global VFS listener for the store
  useEffect(() => {
    initProjectStoreListener();
    return () => {
      cleanupProjectStoreListener();
    };
  }, []);

  // Load initial state
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const projects = await projectService.getProjects();
      if (!isMounted) return;
      
      if (projects.length > 0) {
        const lastId = safeStorage.getItem('ham_last_active_project_id');
        const lastProject = projects.find(p => p.id === lastId) || projects[0];
        
        // Switch VFS context
        vfs.setProjectId(lastProject.id);
        
        // Hydrate if empty
        const files = await vfs.listDir('/');
        const projectFiles = lastProject.data.files || [];
        if (files.length === 0 && projectFiles.length > 0) {
           await vfs.bulkWrite(projectFiles);
        }

        setProject(lastProject.data);
        setHistory(lastProject.chatHistory || []);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  // Handle Project Switching
  useEffect(() => {
    if (project?.id) {
       const currentProjectId = project.id;
       vfs.setProjectId(project.id);
       // Hydrate if empty (e.g. new project or cleared cache)
       vfs.listDir('/').then(files => {
         if (useProjectStore.getState().project?.id !== currentProjectId) return;
         const projectFiles = project.files || [];
         if (files.length === 0 && projectFiles.length > 0) {
           vfs.bulkWrite(projectFiles);
         }
       }).catch(console.error);
    }
  }, [project?.id]);

  // Auto-save
  useEffect(() => {
    if (project) {
      const timer = setTimeout(() => {
        useProjectStore.getState().saveImmediately();
      }, 1000); // Reduced debounce to 1s for better real-time feel
      return () => clearTimeout(timer);
    }
  }, [project, history]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      useProjectStore.getState().saveImmediately();
    };
  }, []);

  const handleSaveImmediately = useCallback(async (projectOverride?: ProjectData, historyOverride?: ChatMessageData[]) => {
    if (projectOverride) setProject(projectOverride);
    if (historyOverride) setHistory(historyOverride);
    await saveImmediately(projectOverride, historyOverride);
  }, [setProject, setHistory, saveImmediately]);

  return useMemo(() => ({
    project,
    setProject,
    history,
    setHistory,
    activeView,
    setActiveView,
    saveImmediately: handleSaveImmediately
  }), [project, setProject, history, setHistory, activeView, setActiveView, handleSaveImmediately]);
}
