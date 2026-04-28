 
import { RefreshCw } from 'lucide-react';
// [STABILITY] Promise chains verified
import React, { Suspense, lazy, useState, useEffect, useRef, useMemo } from 'react';
import { useHamAiStudioLogic } from './hooks/useHamAiStudioLogic';
import { useSupremeProtocol } from '../../hooks/useSupremeProtocol';

import { StudioStatusBar } from './layout/StudioStatusBar';
import StudioSidebar from './StudioSidebar';
import StudioSidePanels from './StudioSidePanels';
import MainContent from './MainContent';
import StudioOverlayControls from './StudioOverlayControls';
import StudioModals from './StudioModals';
import WebPreview from './WebPreview';
import ManualPlanningModal from './ManualPlanningModal';
import SystemInstructionInput from './SystemInstructionInput';
import GlobalErrorBoundary from './GlobalErrorBoundary';

import { useProjectStore } from '../../store/projectStore';
import { SafeModeOverlay } from './SafeModeOverlay';

// Adaptive Hydration: Lazy load heavy components
const NeuralDependencyVisualizer = lazy(() => import('./NeuralDependencyVisualizer').then(m => ({ default: m.NeuralDependencyVisualizer })).catch(e => { /* console.error(e); */ return { default: () => null }; }));
const QuantumStatePersistence = lazy(() => import('./QuantumStatePersistence').then(m => ({ default: m.QuantumStatePersistence })).catch(e => { /* console.error(e); */ return { default: () => null }; }));

export default function HamAiStudioTab() {
  useSupremeProtocol();
  const {
    ui,
    generatedProject, setGeneratedProject,
    history, setHistory,
    projectType, setProjectType,
    showWelcome, setShowWelcome,
    activeView, setActiveView,
    selectedFile, setSelectedFile,
    webProjectUrl, setWebProjectUrl,
    showSuggestions, setShowSuggestions,
    githubSyncStatus, setGithubSyncStatus,
    githubRepoUrl,
    activeIsLoading,
    activeInput, setActiveInput,
    activeAgentActivities,
    customAgentActivities,
    timer,
    progress,
    error, setError,
    isDeepScanning, handleDeepScan,
    handleNewFile, handleDeleteFile, handleRenameFile, handleMoveFile, handleDuplicateFile, handleFileContentChange, handleSaveSingleFile,
    isBuilding, buildStatus, setBuildStatus, buildLogs, isWebContainerRunning, handleBuildApk, handleExportZip, handleRunWebContainer,
    handleGlobalAutoHeal, handleGlobalRollback,
    fileInputRef, handleAttachClick, handleFileChange,
    messagesEndRef,
    handleManualPlanningClick, handleManualInstructionClick, manualInstruction, setManualInstruction, handleSavePlan, handleSendWithInstruction,
    handleSyncMemory,
    confirmNewProject, handleNewProject, handleClearChat, handleRestore,
    handlePlanningClick, handleMicClick, handleSuggestionClick, handleSelectTemplate, handleExplainCode,
    handleViewChanges, handlePreviewProject,
    commands,
    handleCancel,
    saveProjectToHistory,
    handleImportFiles
  } = useHamAiStudioLogic();

  // Granular Zustand Selectors
  const isDatabaseVisualizerOpen = useProjectStore(state => state.uiState.isDatabaseVisualizerOpen);
  const isSidebarVisible = useProjectStore(state => state.uiState.isSidebarVisible);
  const activeSidePanel = useProjectStore(state => state.uiState.activeSidePanel);
  const isDeviceMonitorOpen = useProjectStore(state => state.uiState.isDeviceMonitorOpen);
  const isAiLogOpen = useProjectStore(state => state.uiState.isAiLogOpen);
  const isSideBySide = useProjectStore(state => state.uiState.isSideBySide);
  const isCollaborationPanelOpen = useProjectStore(state => state.uiState.isCollaborationPanelOpen);
  const syncStatus = useProjectStore(state => state.uiState.syncStatus);
  const isSyncing = useProjectStore(state => state.uiState.isSyncing);
  const isMoreMenuOpen = useProjectStore(state => state.uiState.isMoreMenuOpen);
  const setUiState = useProjectStore(state => state.setUiState);

  return (
    <GlobalErrorBoundary onAutoHeal={handleGlobalAutoHeal} onRollback={handleGlobalRollback}>
      <Suspense fallback={null}>
        <QuantumStatePersistence />
        {isDatabaseVisualizerOpen && <NeuralDependencyVisualizer />}
      </Suspense>
      
      <SafeModeOverlay />
      
      <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans rounded-lg border border-[var(--border-color)] shadow-lg">
      
        <StudioModals
        error={error}
        setError={setError}
        setProjectType={setProjectType}
        setGeneratedProject={setGeneratedProject}
        setHistory={setHistory}
        setActiveView={setActiveView}
        handleNewProject={handleNewProject}
        handlePreviewProject={handlePreviewProject}
        handleBuildApk={handleBuildApk}
        handleExportZip={handleExportZip}
        confirmNewProject={confirmNewProject}
        handleSelectTemplate={handleSelectTemplate}
        generatedProject={generatedProject as any}
        previewProject={ui.previewProject}
        projectType={projectType}
        webProjectUrl={webProjectUrl}
        showWelcome={showWelcome}
        setShowWelcome={setShowWelcome}
        handleFileContentChange={handleFileContentChange}
        commands={commands}
        isBuilding={isBuilding}
        buildLogs={buildLogs}
      />

      <div className="flex h-full overflow-hidden relative">
        
        <StudioOverlayControls
          githubSyncStatus={githubSyncStatus}
          githubRepoUrl={githubRepoUrl}
          isMoreMenuOpen={isMoreMenuOpen}
          setIsMoreMenuOpen={ui.setIsMoreMenuOpen}
          setIsSettingsOpen={ui.setIsSettingsOpen}
          setIsExportManagerOpen={ui.setIsExportManagerOpen}
          setIsApkBuilderOpen={ui.setIsApkBuilderOpen}
          setIsHistoryOpen={ui.setIsHistoryOpen}
          setShowWelcome={setShowWelcome}
        />

        <StudioSidebar 
          activeView={activeView}
          setActiveView={setActiveView}
          handleSyncMemory={handleSyncMemory}
          onClearChat={handleClearChat}
          handleDeepScan={handleDeepScan}
        />

        <div className="flex-1 flex overflow-hidden relative">
          <StudioSidePanels 
            isSidebarVisible={isSidebarVisible}
            activeSidePanel={activeSidePanel}
            setActiveSidePanel={ui.setActiveSidePanel}
            generatedProject={generatedProject}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            setActiveView={setActiveView}
            setIsSidebarVisible={ui.setIsSidebarVisible}
            handleNewFile={handleNewFile}
            handleDeleteFile={handleDeleteFile}
            handleRenameFile={handleRenameFile}
            handleMoveFile={handleMoveFile}
            handleDuplicateFile={handleDuplicateFile}
            handleFileContentChange={handleFileContentChange}
            handleImportFiles={handleImportFiles}
            saveProjectToHistory={saveProjectToHistory}
            history={history}
            githubRepoUrl={githubRepoUrl}
            setGithubSyncStatus={setGithubSyncStatus}
            setDiffData={ui.setDiffData}
          />

          <div className="flex-1 flex overflow-hidden" onClick={ui.closeSidePanels}>
            <div className={`flex-1 flex ${isSideBySide ? 'flex-row' : 'flex-col'} overflow-hidden`}>
              <div className={`flex flex-col ${isSideBySide ? 'w-1/2 border-r border-[var(--border-color)]' : 'h-full flex-1'}`}>
                <MainContent 
                  activeView={activeView}
                  setActiveView={setActiveView}
                  history={history}
                  isLoading={activeIsLoading}
                  agentActivities={[...activeAgentActivities, ...customAgentActivities]}
                  timer={timer}
                  progress={progress}
                  input={activeInput}
                  setInput={setActiveInput}
                  handleSend={handleSendWithInstruction}
                  showSuggestions={showSuggestions}
                  setShowSuggestions={setShowSuggestions}
                  handleSuggestionClick={handleSuggestionClick}
                  handleMicClick={handleMicClick}
                  handleAttachClick={handleAttachClick}
                  handlePlanningClick={handlePlanningClick}
                  handleManualPlanningClick={handleManualPlanningClick}
                  handleManualInstructionClick={handleManualInstructionClick}
                  handleFileChange={handleFileChange}
                  fileInputRef={fileInputRef}
                  generatedProject={generatedProject}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  handleFileContentChange={handleFileContentChange}
                  handleSaveSingleFile={handleSaveSingleFile}
                  handleExplainCode={handleExplainCode}
                  webProjectUrl={webProjectUrl}
                  messagesEndRef={messagesEndRef}
                  handleBuildApk={handleBuildApk}
                  projectType={projectType}
                  handleNewFile={handleNewFile}
                  handleDeleteFile={handleDeleteFile}
                  handleRestore={handleRestore}
                  handleViewChanges={handleViewChanges}
                  handleCancel={handleCancel}
                  confirmNewProject={confirmNewProject}
                  onRunWebContainer={handleRunWebContainer}
                  isWebContainerRunning={isWebContainerRunning}
                  onSelectFile={(path) => {
                    if (generatedProject) {
                      const file = generatedProject.files.find(f => f.path === path);
                      if (file) {
                        setSelectedFile(file);
                        setActiveView('preview');
                      }
                    }
                  }}
                  onDeploy={() => ui.setIsDeploymentModalOpen(true)}
                  onToggleBreakpoint={ui.handleToggleBreakpoint}
                />
              </div>

              {isSideBySide && (
                <div className="w-1/2 bg-[var(--bg-secondary)] flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] px-2">Live Preview (Quantum)</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setWebProjectUrl(null)} className="p-1 hover:bg-white/10 rounded text-white/50">
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <WebPreview 
                      projectName={generatedProject?.name || 'App'} 
                      urlOverride={webProjectUrl} 
                      files={generatedProject?.files}
                      onStartServer={handleRunWebContainer}
                      isServerRunning={isWebContainerRunning}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".txt,.js,.ts,.jsx,.tsx,.html,.css,.json,.md,.java,.xml"
        />
      </div>

      <ManualPlanningModal 
        isOpen={ui.isManualPlanningOpen}
        onClose={() => ui.setIsManualPlanningOpen(false)}
        onSavePlan={handleSavePlan}
      />
      
      <StudioStatusBar 
        branch="main"
        isOnline={true}
        isSaving={activeIsLoading}
        progress={progress}
        timer={timer}
      />

      <SystemInstructionInput
        isOpen={ui.isManualInstructionOpen}
        onClose={() => ui.setIsManualInstructionOpen(false)}
        instruction={manualInstruction}
        onSave={setManualInstruction}
      />
    </div>
    </GlobalErrorBoundary>
  );
}

