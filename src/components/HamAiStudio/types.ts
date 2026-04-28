export interface ProjectFile {
  id?: string;
  path: string;
  content: string;
  language?: string;
  name?: string;
  type?: 'file' | 'folder';
  children?: ProjectFile[];
}

export type FileData = ProjectFile;

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
  dependencies?: Record<string, string>;
  chatHistory?: ChatMessageData[];
}

export interface FileEdit {
  path: string;
  type: 'added' | 'modified' | 'deleted' | 'unchanged';
}

export interface GenerationStep {
  id: string;
  type: 'thought' | 'response' | 'edit' | 'build' | 'error' | 'action' | 'warning' | 'success';
  label: string;
  details?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'error' | 'warning';
  duration?: number;
  progress?: number;
}

export interface AgentActivity {
  id: string;
  type: 'thought' | 'action' | 'error' | 'success' | 'warning' | 'file_change' | 'plan' | 'tool' | 'correction';
  details: string;
  timestamp: number;
  metadata?: any;
  title?: string;
  // Legacy support
  agent?: string;
  status?: string;
  progress?: number;
}

export interface ChatMessageData {
  id?: string;
  role: 'user' | 'ai' | 'system' | 'assistant';
  content: string;
  time?: number;
  timestamp?: number;
  attachments?: any[];
  projectSnapshot?: ProjectData;
  feedback?: 'up' | 'down';
  editedFiles?: FileEdit[];
  isError?: boolean;
  activities?: AgentActivity[];
  steps?: GenerationStep[];
}

export interface Command {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export interface StudioUI {
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
  setIsSidebarVisible: (val: boolean) => void;
  setActiveSidePanel: (val: 'none' | 'packages' | 'git' | 'search' | 'terminal') => void;
  setIsDeviceMonitorOpen: (val: boolean) => void;
  setIsAiLogOpen: (val: boolean) => void;
  setIsSideBySide: (val: boolean) => void;
  setIsCollaborationPanelOpen: (val: boolean) => void;
  setIsSettingsOpen: (val: boolean) => void;
  setIsHistoryOpen: (val: boolean) => void;
  setIsTemplateGalleryOpen: (val: boolean) => void;
  setIsExportManagerOpen: (val: boolean) => void;
  setIsAnalyticsDashboardOpen: (val: boolean) => void;
  setIsDatabaseVisualizerOpen: (val: boolean) => void;
  setIsLiveSessionOpen: (val: boolean) => void;
  setIsFullPreviewOpen: (val: boolean) => void;
  setIsDeploymentModalOpen: (val: boolean) => void;
  setIsNewProjectModalOpen: (val: boolean) => void;
  setIsMoreMenuOpen: (val: boolean) => void;
  setIsMarketplaceOpen: (val: boolean) => void;
  setIsDebuggerOpen: (val: boolean) => void;
  setIsCommandPaletteOpen: (val: boolean) => void;
  setIsApkBuilderOpen: (val: boolean) => void;
  setIsLocalMode: (val: boolean) => void;
  setIsManualPlanningOpen: (val: boolean) => void;
  setIsManualInstructionOpen: (val: boolean) => void;
  setPreviewProject: (val: ProjectData | null) => void;
  setTourStep: (val: number | null) => void;
  setDiffData: (val: { path: string, oldContent: string, newContent: string } | null) => void;
  setBreakpoints: (val: Record<string, number[]>) => void;
  setIsSyncing: (val: boolean) => void;
  setSyncStatus: (val: 'idle' | 'syncing' | 'success') => void;
  closeSidePanels: () => void;
  handleToggleBreakpoint: (path: string, line: number) => void;
}
