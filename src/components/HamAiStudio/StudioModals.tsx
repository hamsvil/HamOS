import React from 'react';
import { Layout, Zap } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

import SettingsModal from './SettingsModal';
import ProjectHistoryModal from './ProjectHistoryModal';
import ApkBuilderModal from './ApkBuilderModal';
import LiveSessionModal from './LiveSessionModal';
import FullAppPreviewModal from './FullAppPreviewModal';
import DeploymentModal from './Deployment/DeploymentModal';
import TemplateGalleryModal from './TemplateGalleryModal';
import ProjectExportModal from './ProjectExportModal';
import AnalyticsDashboardModal from './AnalyticsDashboardModal';
import DatabaseVisualizerModal from './DatabaseVisualizerModal';
import CollaborationPanel from './CollaborationPanel';
import DeviceMonitor from './Device/DeviceMonitor';
import DebuggerPanel from './Debugger/DebuggerPanel';
import MarketplacePanel from './Marketplace/MarketplacePanel';
import DiffViewer from './Git/DiffViewer';
import WelcomeScreen from './WelcomeScreen';
import TourOverlay from './TourOverlay';
import PerformanceOverlay from './Device/PerformanceOverlay';
import CommandPalette from './CommandPalette';
import ErrorMessage from './ErrorMessage';

import { ChatMessageData, ProjectData, Command } from './types';

interface ErrorData {
  title: string;
  message: string;
}

interface StudioModalsProps {
  error: ErrorData | null;
  setError: (error: ErrorData | null) => void;
  setProjectType: (type: string) => void;
  setGeneratedProject: (project: ProjectData) => void;
  setHistory: (history: ChatMessageData[] | ((prev: ChatMessageData[]) => ChatMessageData[])) => void;
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  handleNewProject: () => void;
  handlePreviewProject: (project: ProjectData) => void;
  handleBuildApk: (project?: ProjectData) => void;
  handleExportZip: (project?: ProjectData) => void;
  confirmNewProject: (type: 'web' | 'apk') => void;
  handleSelectTemplate: (prompt: string) => void;
  generatedProject: ProjectData | null;
  previewProject: ProjectData | null;
  projectType: string;
  webProjectUrl: string | null;
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
  handleFileContentChange: (path: string, content: string) => void;
  commands: Command[];
  isBuilding?: boolean;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  setBuildStatus?: (status: 'idle' | 'building' | 'success' | 'error') => void;
  buildLogs?: string[];
}

export default function StudioModals({
  error, setError, setProjectType, setGeneratedProject, setHistory, setActiveView, handleNewProject, handlePreviewProject, handleBuildApk, handleExportZip,
  confirmNewProject, handleSelectTemplate, generatedProject, previewProject, projectType, webProjectUrl,
  showWelcome, setShowWelcome, handleFileContentChange, commands,
  isBuilding, buildStatus, setBuildStatus, buildLogs
}: StudioModalsProps) {
  const { uiState, setUiState } = useProjectStore();
  
  return (
    <>
      {error && 
        <ErrorMessage 
          title={error.title} 
          message={error.message} 
          onClose={() => setError(null)} 
        />
      }

      <SettingsModal 
        isOpen={uiState.isSettingsOpen} 
        onClose={() => setUiState({ isSettingsOpen: false })} 
        onProjectTypeChange={setProjectType}
      />
      <ProjectHistoryModal 
        isOpen={uiState.isHistoryOpen} 
        onClose={() => setUiState({ isHistoryOpen: false })} 
        onLoadProject={(project, chatHistory) => {
          setGeneratedProject(project);
          if (chatHistory) setHistory(chatHistory);
          setActiveView('chat');
        }}
        onNewProject={() => {
          setUiState({ isHistoryOpen: false });
          handleNewProject();
        }}
        onPreviewProject={handlePreviewProject}
        onBuildProject={(project) => {
          setGeneratedProject(project);
          handleBuildApk(project);
        }}
      />

      {uiState.isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Mulai Project Baru</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">Pilih jenis aplikasi yang ingin Anda bangun. Project saat ini akan disimpan otomatis ke History.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => confirmNewProject('web')}
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layout size={24} className="text-blue-400" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-[var(--text-primary)] text-sm">Project Web App</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">React, Vite, Tailwind</div>
                </div>
              </button>

              <button 
                onClick={() => confirmNewProject('apk')}
                className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:bg-green-500/10 hover:border-green-500/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap size={24} className="text-green-400" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-[var(--text-primary)] text-sm">Project Native APK</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">Android, Java, XML</div>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setUiState({ isNewProjectModalOpen: false })}
              className="mt-6 w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <TemplateGalleryModal
        isOpen={uiState.isTemplateGalleryOpen}
        onClose={() => setUiState({ isTemplateGalleryOpen: false })}
        onSelectTemplate={handleSelectTemplate}
      />
      <ProjectExportModal
        isOpen={uiState.isExportManagerOpen}
        onClose={() => setUiState({ isExportManagerOpen: false })}
        project={generatedProject}
        onExport={(type, selectedFiles) => {
          if (type === 'zip') {
            handleExportZip(generatedProject);
          } else {
            handleBuildApk(generatedProject);
          }
        }}
        isExporting={!!isBuilding}
        buildStatus={buildStatus}
        onReset={() => setBuildStatus?.('idle')}
        logs={buildLogs || []}
      />
      <AnalyticsDashboardModal
        isOpen={uiState.isAnalyticsDashboardOpen}
        onClose={() => setUiState({ isAnalyticsDashboardOpen: false })}
        generatedProject={generatedProject}
      />

      <DatabaseVisualizerModal
        isOpen={uiState.isDatabaseVisualizerOpen}
        onClose={() => setUiState({ isDatabaseVisualizerOpen: false })}
        generatedProject={generatedProject}
      />
      <ApkBuilderModal
        isOpen={uiState.isApkBuilderOpen}
        onClose={() => setUiState({ isApkBuilderOpen: false })}
        project={generatedProject}
      />
      <LiveSessionModal
        isOpen={uiState.isLiveSessionOpen}
        onClose={() => setUiState({ isLiveSessionOpen: false })}
      />

      <FullAppPreviewModal
        isOpen={uiState.isFullPreviewOpen}
        onClose={() => setUiState({ isFullPreviewOpen: false })}
        project={previewProject}
        projectType={projectType}
        webProjectUrl={webProjectUrl}
      />
      <CollaborationPanel
        isOpen={uiState.isCollaborationPanelOpen}
        onClose={() => setUiState({ isCollaborationPanelOpen: false })}
        projectId={generatedProject?.name || 'default-project'}
      />

      {showWelcome && (
        <WelcomeScreen 
          onStartTour={() => { setShowWelcome(false); setUiState({ tourStep: 0 }); }}
          onStartCreating={() => setShowWelcome(false)}
        />
      )}
      
      {uiState.tourStep !== null && (
        <TourOverlay 
          step={uiState.tourStep} 
          onClose={() => setUiState({ tourStep: null })} 
          onNext={() => setUiState({ tourStep: uiState.tourStep! < 3 ? uiState.tourStep! + 1 : null })}
          onBack={() => setUiState({ tourStep: uiState.tourStep! > 0 ? uiState.tourStep! - 1 : null })}
        />
      )}

      <DeviceMonitor isOpen={uiState.isDeviceMonitorOpen} onClose={() => setUiState({ isDeviceMonitorOpen: false })} />
      
      <DebuggerPanel 
        isOpen={uiState.isDebuggerOpen} 
        onClose={() => setUiState({ isDebuggerOpen: false })} 
      />

      <MarketplacePanel isOpen={uiState.isMarketplaceOpen} onClose={() => setUiState({ isMarketplaceOpen: false })} />

      {uiState.diffData && (
        <DiffViewer 
          oldValue={uiState.diffData.oldContent} 
          newValue={uiState.diffData.newContent} 
          oldTitle="HEAD"
          newTitle="Working Copy"
          onClose={() => setUiState({ diffData: null })}
          onAccept={() => {
            handleFileContentChange(uiState.diffData!.path, uiState.diffData!.newContent);
            setUiState({ diffData: null });
          }}
        />
      )}

      <DeploymentModal 
        isOpen={uiState.isDeploymentModalOpen} 
        onClose={() => setUiState({ isDeploymentModalOpen: false })} 
        project={generatedProject} 
      />

      <PerformanceOverlay />
      <CommandPalette 
        isOpen={uiState.isCommandPaletteOpen} 
        onClose={() => setUiState({ isCommandPaletteOpen: false })} 
        commands={commands} 
      />
    </>
  );
}
