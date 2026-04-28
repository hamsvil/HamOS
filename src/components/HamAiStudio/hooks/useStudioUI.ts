 
import { useProjectStore } from '../../../store/projectStore';
import { ProjectData } from '../types';

export function useStudioUI() {
  const { uiState, setUiState } = useProjectStore();

  const setIsSidebarVisible = (isSidebarVisible: boolean) => setUiState({ isSidebarVisible });
  const setActiveSidePanel = (activeSidePanel: 'none' | 'packages' | 'git' | 'search' | 'terminal') => setUiState({ activeSidePanel });
  const setIsDeviceMonitorOpen = (isDeviceMonitorOpen: boolean) => setUiState({ isDeviceMonitorOpen });
  const setIsAiLogOpen = (isAiLogOpen: boolean) => setUiState({ isAiLogOpen });
  const setIsSideBySide = (isSideBySide: boolean) => setUiState({ isSideBySide });
  const setIsCollaborationPanelOpen = (isCollaborationPanelOpen: boolean) => setUiState({ isCollaborationPanelOpen });
  const setIsSettingsOpen = (isSettingsOpen: boolean) => setUiState({ isSettingsOpen });
  const setIsHistoryOpen = (isHistoryOpen: boolean) => setUiState({ isHistoryOpen });
  const setIsTemplateGalleryOpen = (isTemplateGalleryOpen: boolean) => setUiState({ isTemplateGalleryOpen });
  const setIsExportManagerOpen = (isExportManagerOpen: boolean) => setUiState({ isExportManagerOpen });
  const setIsAnalyticsDashboardOpen = (isAnalyticsDashboardOpen: boolean) => setUiState({ isAnalyticsDashboardOpen });
  const setIsDatabaseVisualizerOpen = (isDatabaseVisualizerOpen: boolean) => setUiState({ isDatabaseVisualizerOpen });
  const setIsLiveSessionOpen = (isLiveSessionOpen: boolean) => setUiState({ isLiveSessionOpen });
  const setIsFullPreviewOpen = (isFullPreviewOpen: boolean) => setUiState({ isFullPreviewOpen });
  const setIsDeploymentModalOpen = (isDeploymentModalOpen: boolean) => setUiState({ isDeploymentModalOpen });
  const setIsNewProjectModalOpen = (isNewProjectModalOpen: boolean) => setUiState({ isNewProjectModalOpen });
  const setIsMoreMenuOpen = (isMoreMenuOpen: boolean) => setUiState({ isMoreMenuOpen });
  const setIsMarketplaceOpen = (isMarketplaceOpen: boolean) => setUiState({ isMarketplaceOpen });
  const setIsDebuggerOpen = (isDebuggerOpen: boolean) => setUiState({ isDebuggerOpen });
  const setIsCommandPaletteOpen = (isCommandPaletteOpen: boolean) => setUiState({ isCommandPaletteOpen });
  const setIsApkBuilderOpen = (isApkBuilderOpen: boolean) => setUiState({ isApkBuilderOpen });
  const setIsLocalMode = (isLocalMode: boolean) => setUiState({ isLocalMode });
  const setIsManualPlanningOpen = (isManualPlanningOpen: boolean) => setUiState({ isManualPlanningOpen });
  const setIsManualInstructionOpen = (isManualInstructionOpen: boolean) => setUiState({ isManualInstructionOpen });
  const setPreviewProject = (previewProject: ProjectData | null) => setUiState({ previewProject });
  const setTourStep = (tourStep: number | null) => setUiState({ tourStep });
  const setDiffData = (diffData: { path: string, oldContent: string, newContent: string } | null) => setUiState({ diffData });
  const setBreakpoints = (breakpoints: Record<string, number[]>) => setUiState({ breakpoints });
  const setIsSyncing = (isSyncing: boolean) => setUiState({ isSyncing });
  const setSyncStatus = (syncStatus: 'idle' | 'syncing' | 'success') => setUiState({ syncStatus });

  const closeSidePanels = () => {
    setUiState({
      isSidebarVisible: false,
      activeSidePanel: 'none',
      isCollaborationPanelOpen: false,
      isMoreMenuOpen: false,
      isDeviceMonitorOpen: false,
      isDebuggerOpen: false,
    });
  };

  const handleToggleBreakpoint = (path: string, line: number) => {
    const currentBreakpoints = uiState.breakpoints;
    const current = currentBreakpoints[path] || [];
    const next = current.includes(line) 
      ? current.filter(l => l !== line) 
      : [...current, line];
    setUiState({ breakpoints: { ...currentBreakpoints, [path]: next } });
  };

  return {
    ...uiState,
    setIsSidebarVisible,
    setActiveSidePanel,
    setIsDeviceMonitorOpen,
    setIsAiLogOpen,
    setIsSideBySide,
    setIsCollaborationPanelOpen,
    setIsSettingsOpen,
    setIsHistoryOpen,
    setIsTemplateGalleryOpen,
    setIsExportManagerOpen,
    setIsAnalyticsDashboardOpen,
    setIsDatabaseVisualizerOpen,
    setIsLiveSessionOpen,
    setIsFullPreviewOpen,
    setIsDeploymentModalOpen,
    setIsNewProjectModalOpen,
    setIsMoreMenuOpen,
    setIsMarketplaceOpen,
    setIsDebuggerOpen,
    setIsCommandPaletteOpen,
    setIsApkBuilderOpen,
    setIsLocalMode,
    setIsManualPlanningOpen,
    setIsManualInstructionOpen,
    setPreviewProject,
    setTourStep,
    setDiffData,
    setBreakpoints,
    setIsSyncing,
    setSyncStatus,
    closeSidePanels,
    handleToggleBreakpoint
  };
}
