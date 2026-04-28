 
import { useCallback, useRef, useEffect } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useAiAgent } from './useAiAgent';
import { useAiActions } from './useAiActions';
import { useProjectLifecycle } from './useProjectLifecycle';
import { useGithubSync } from './useGithubSync';
import { useToast } from '../../../context/ToastContext';
import { ProjectData, ChatMessageData, ProjectFile } from '../types';

export function useStudioAi(
  generatedProject: ProjectData | null,
  setGeneratedProject: (project: ProjectData | null) => void,
  history: ChatMessageData[],
  setHistory: (history: ChatMessageData[] | ((prev: ChatMessageData[]) => ChatMessageData[])) => void,
  activeView: 'chat' | 'preview' | 'dashboard',
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void,
  saveProjectToHistory: (project?: ProjectData, history?: ChatMessageData[]) => Promise<void>,
  saveProjectToDevice: (project: ProjectData) => Promise<void>,
  ui: any,
  setSelectedFile: (file: ProjectFile | null) => void,
  setProjectType: (type: 'web' | 'apk') => void,
  setShowSuggestions: (show: boolean) => void
) {
  const { showToast } = useToast();
  
  const handleSaveImmediately = useCallback((project?: ProjectData, history?: ChatMessageData[]) => {
    return saveProjectToHistory(project, history);
  }, [saveProjectToHistory]);

  const aiAgent = useAiAgent({
    project: generatedProject,
    setProject: setGeneratedProject,
    history,
    setHistory,
    activeView,
    setActiveView,
    saveImmediately: handleSaveImmediately
  });

  const aiActions = useAiActions({
    handleSend: aiAgent.handleSend,
    setInput: aiAgent.setInput,
    isLocalMode: ui.isLocalMode,
    ui,
    generatedProject
  });

  const lifecycle = useProjectLifecycle({
    generatedProject, setGeneratedProject,
    history, setHistory,
    setInput: aiAgent.setInput,
    setActiveView,
    setShowSuggestions,
    setProjectType,
    saveProjectToHistory,
    saveProjectToDevice,
    ui,
    setSelectedFile
  });

  const github = useGithubSync();

  // Auto-Resume Logic
  const resumedProjectsRef = useRef<Set<string>>(new Set());
  const activeHandleSendRef = useRef(aiAgent.handleSend);
  const activeIsLoadingRef = useRef(aiAgent.isLoading);

  useEffect(() => {
    activeHandleSendRef.current = aiAgent.handleSend;
    activeIsLoadingRef.current = aiAgent.isLoading;
  }, [aiAgent.handleSend, aiAgent.isLoading]);

  useEffect(() => {
    const handleAutoResume = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { projectId, projectData } = customEvent.detail;
      if (generatedProject?.id !== projectId) {
        setGeneratedProject(projectData);
      }
      if (!activeIsLoadingRef.current && !resumedProjectsRef.current.has(projectId)) {
        resumedProjectsRef.current.add(projectId);
        showToast("Melanjutkan pekerjaan yang terputus...", "info");
        activeHandleSendRef.current(undefined, "lanjutkan pekerjaan sebelumnya yang terputus");
      }
    };
    window.addEventListener('ham-auto-resume', handleAutoResume);
    return () => window.removeEventListener('ham-auto-resume', handleAutoResume);
  }, [generatedProject?.id, setGeneratedProject, showToast]);

  return {
    ...aiAgent,
    ...aiActions,
    ...lifecycle,
    ...github,
    resumedProjectsRef,
    activeHandleSendRef,
    activeIsLoadingRef
  };
}
