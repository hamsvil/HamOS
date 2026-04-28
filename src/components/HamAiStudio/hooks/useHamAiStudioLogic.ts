 
import { useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useStudioLifecycle } from './useStudioLifecycle';
import { useStudioFiles } from './useStudioFiles';
import { useStudioBuild } from './useStudioBuild';
import { useStudioChat } from './useStudioChat';
import { useStudioUI } from './useStudioUI';
import { useStudioShortcuts } from './useStudioShortcuts';
import { useStudioCommands } from './useStudioCommands';
import { hamliMemoryService } from '../../../services/hamliMemoryService';
import { ProjectData, ChatMessageData } from '../types';

export function useHamAiStudioLogic() {
  const setUiState = useProjectStore(state => state.setUiState);
  const useAgentic = useProjectStore(state => state.uiState.useAgentic);
  const error = useProjectStore(state => state.uiState.error);
  const localLlmReady = useProjectStore(state => state.uiState.localLlmReady);
  const manualInstruction = useProjectStore(state => state.uiState.manualInstruction);
  
  const setUseAgentic = (val: boolean) => setUiState({ useAgentic: val });
  const setError = (val: { title: string; message: string; } | null) => setUiState({ error: val });
  const setLocalLlmReady = (val: boolean) => setUiState({ localLlmReady: val });
  const setManualInstruction = (val: string) => setUiState({ manualInstruction: val });

  // Core Project Management
  const {
    generatedProject, setGeneratedProject,
    history, setHistory,
    projectType, setProjectType,
    isResuming, setIsResuming,
    showWelcome, setShowWelcome,
    activeView, setActiveView,
    selectedFile, setSelectedFile,
    webProjectUrl, setWebProjectUrl,
    showSuggestions, setShowSuggestions,
    saveProjectToHistory,
    saveCurrentState,
    saveProjectToDevice
  } = useStudioLifecycle();

  // UI State Hook
  const ui = useStudioUI();

  // AI Hook
  const ai = useStudioChat(
    generatedProject, setGeneratedProject,
    history, setHistory,
    activeView, setActiveView,
    saveProjectToHistory,
    saveProjectToDevice,
    ui,
    setSelectedFile,
    setProjectType,
    setShowSuggestions
  );

  // Files Hook
  const files = useStudioFiles(
    generatedProject,
    setGeneratedProject,
    ai.setInput
  );

  // Build Hook
  const build = useStudioBuild(
    generatedProject,
    projectType,
    ai.handleSend,
    files.setAgentActivities,
    setError,
    ui.setIsApkBuilderOpen,
    setActiveView
  );

  // Shortcuts Hook
  useStudioShortcuts(selectedFile, generatedProject, files.handleFileContentChange, ui.setIsCommandPaletteOpen);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Manual Planning Handlers
  const handleManualPlanningClick = () => ui.setIsManualPlanningOpen(true);
  const handleManualInstructionClick = () => ui.setIsManualInstructionOpen(true);

  const handleSavePlan = (tasks: { priority: string; title: string }[]) => {
    const planText = tasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title}`).join('\n');
    const prompt = `[MANUAL PLAN]\nHere is my manual plan for the day:\n${planText}\n\nPlease execute this plan.`;
    ai.handleSend(undefined, prompt);
  };

  const handleSendWithInstruction = (e?: React.FormEvent, promptOverride?: string) => {
    let finalPrompt = promptOverride || ai.input;
    if (manualInstruction) {
      finalPrompt += `\n\n[MANUAL INSTRUCTION]:\n${manualInstruction}`;
    }
    ai.handleSend(e, finalPrompt);
  };

  const debouncedSave = useCallback(
    (project: ProjectData, history: ChatMessageData[]) => {
      const timeoutId = setTimeout(() => {
        saveProjectToHistory(project, history);
        saveProjectToDevice(project);
        saveCurrentState();
      }, 5000);
      return () => clearTimeout(timeoutId);
    },
    [saveProjectToHistory, saveProjectToDevice, saveCurrentState]
  );

  useEffect(() => {
    if (generatedProject) {
      return debouncedSave(generatedProject, history);
    }
  }, [generatedProject, history, activeView, selectedFile, webProjectUrl, projectType, debouncedSave]);

  useEffect(() => {
    if (activeView === 'preview' && generatedProject && !build.isWebContainerRunning && !webProjectUrl && !build.previewAttemptedRef.current) {
      build.previewAttemptedRef.current = true;
      build.handleRunWebContainer();
    }
  }, [activeView, generatedProject, build.isWebContainerRunning, webProjectUrl]);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSyncMemory = async () => {
    if (ui.isSyncing) return;
    ui.setIsSyncing(true);
    ui.setSyncStatus('syncing');
    try {
      await hamliMemoryService.getMemory();
      ui.setSyncStatus('success');
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => ui.setSyncStatus('idle'), 3000);
    } catch (e) {
      console.error('Sync failed:', e);
      ui.setSyncStatus('idle');
    } finally {
      ui.setIsSyncing(false);
    }
  };

  const handleViewChanges = (projectSnapshot: ProjectData) => {
    ui.setPreviewProject(projectSnapshot);
    ui.setIsFullPreviewOpen(true);
  };

  const handlePreviewProject = (project: ProjectData) => {
    ui.setPreviewProject(project);
    ui.setIsFullPreviewOpen(true);
  };

  const commands = useStudioCommands({
    selectedFile,
    handleFileContentChange: files.handleFileContentChange,
    handleNewFile: files.handleNewFile,
    ui,
    handleClearChat: ai.handleClearChat,
    handleGitHubAutoSync: ai.handleGitHubAutoSync,
    generatedProject
  });

  return {
    ui,
    generatedProject, setGeneratedProject,
    history, setHistory,
    projectType, setProjectType,
    showWelcome, setShowWelcome,
    activeView, setActiveView,
    selectedFile, setSelectedFile,
    webProjectUrl, setWebProjectUrl,
    showSuggestions, setShowSuggestions,
    githubSyncStatus: ai.githubSyncStatus, setGithubSyncStatus: ai.setGithubSyncStatus,
    githubRepoUrl: ai.githubRepoUrl,
    activeIsLoading: ai.isLoading,
    activeInput: ai.input, setActiveInput: ai.setInput,
    activeAgentActivities: ai.agentActivities,
    customAgentActivities: files.customAgentActivities,
    timer: ai.timer,
    progress: ai.progress,
    error, setError,
    isDeepScanning: files.isDeepScanning, handleDeepScan: files.handleDeepScan,
    handleNewFile: files.handleNewFile, handleDeleteFile: files.handleDeleteFile, handleRenameFile: files.handleRenameFile, handleMoveFile: files.handleMoveFile, handleDuplicateFile: files.handleDuplicateFile, handleFileContentChange: files.handleFileContentChange, handleSaveSingleFile: files.handleSaveSingleFile,
    isBuilding: build.isBuilding, buildStatus: build.buildStatus, setBuildStatus: build.setBuildStatus, buildLogs: build.buildLogs, isWebContainerRunning: build.isWebContainerRunning, handleBuildApk: build.handleBuildApk, handleExportZip: build.handleExportZip, handleRunWebContainer: build.handleRunWebContainer,
    isBuildDisabled: build.isBuildDisabled, buildError: build.buildError,
    handleGlobalAutoHeal: build.handleGlobalAutoHeal, handleGlobalRollback: build.handleGlobalRollback,
    fileInputRef: files.fileInputRef, handleAttachClick: files.handleAttachClick, handleFileChange: files.handleFileChange,
    messagesEndRef,
    handleManualPlanningClick, handleManualInstructionClick, manualInstruction, setManualInstruction, handleSavePlan, handleSendWithInstruction,
    handleSyncMemory,
    confirmNewProject: ai.confirmNewProject, handleNewProject: ai.handleNewProject, handleClearChat: ai.handleClearChat, handleRestore: ai.handleRestore,
    handlePlanningClick: ai.handlePlanningClick, handleMicClick: ai.handleMicClick, handleSuggestionClick: ai.handleSuggestionClick, handleSelectTemplate: ai.handleSelectTemplate, handleExplainCode: ai.handleExplainCode,
    handleViewChanges, handlePreviewProject,
    commands,
    handleCancel: ai.handleCancel,
    saveProjectToHistory,
    handleImportFiles: files.handleImportFiles
  };
}

