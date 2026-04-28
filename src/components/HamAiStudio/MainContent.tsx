 
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectData, ProjectFile, ChatMessageData, AgentActivity } from './types';
import Dashboard from './Dashboard';
import ChatView from './ChatView';
import PreviewView from './PreviewView';
import { useProjectStore } from '../../store/projectStore';

interface MainContentProps {
  activeView: 'chat' | 'preview' | 'dashboard';
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  history: ChatMessageData[];
  isLoading: boolean;
  agentActivities: AgentActivity[];
  timer: number;
  progress: number;
  input: string;
  setInput: (value: string) => void;
  handleSend: (e?: React.FormEvent, promptOverride?: string) => void;
  showSuggestions: boolean;
  handleSuggestionClick: (text: string) => void;
  handleMicClick: () => void;
  handleAttachClick: () => void;
  handlePlanningClick?: () => void;
  handleManualPlanningClick?: () => void;
  handleManualInstructionClick?: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  generatedProject: ProjectData | null;
  selectedFile: ProjectFile | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<ProjectFile | null>>;
  handleFileContentChange: (path: string, content: string) => void;
  handleSaveSingleFile: (path: string, content: string) => void;
  handleExplainCode: (code: string) => void;
  webProjectUrl: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleBuildApk: () => void;
  projectType: string;
  handleNewFile: (path: string, isFolder?: boolean) => void;
  handleDeleteFile: (path: string) => void;
  handleRestore: (project: ProjectData) => void;
  handleViewChanges: (project: ProjectData) => void;
  handleCancel: () => void;
  confirmNewProject: (type: 'web' | 'apk') => Promise<void>;
  onSelectFile?: (path: string) => void;
  onDeploy: () => void;
  onRunWebContainer?: () => void;
  isWebContainerRunning?: boolean;
  isBuildDisabled?: boolean;
  buildError?: string | null;
  onToggleBreakpoint: (path: string, line: number) => void;
}

export default function MainContent({ 
  activeView, setActiveView, history, isLoading, agentActivities, timer, progress, input, setInput, handleSend, 
  showSuggestions, handleSuggestionClick, handleMicClick, handleAttachClick, handlePlanningClick, handleManualPlanningClick, handleManualInstructionClick, handleFileChange, fileInputRef, setShowSuggestions, generatedProject, 
  selectedFile, setSelectedFile, handleFileContentChange, handleSaveSingleFile, handleExplainCode, webProjectUrl, messagesEndRef,
  handleBuildApk, projectType, handleNewFile, handleDeleteFile, handleRestore, handleViewChanges, handleCancel, confirmNewProject, onSelectFile, onDeploy,
  onRunWebContainer, isWebContainerRunning,
  isBuildDisabled, buildError,
  onToggleBreakpoint
}: MainContentProps) {
  const [isSplitView, setIsSplitView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isSidebarVisible = useProjectStore(state => state.uiState.isSidebarVisible);
  const isLocalMode = useProjectStore(state => state.uiState.isLocalMode);
  const isDebuggerOpen = useProjectStore(state => state.uiState.isDebuggerOpen);
  const breakpoints = useProjectStore(state => state.uiState.breakpoints);
  const setUiState = useProjectStore(state => state.setUiState);

  const setIsSidebarVisible = (visible: boolean) => setUiState({ isSidebarVisible: visible });
  const setIsLocalMode = (localMode: boolean) => setUiState({ isLocalMode: localMode });
  const setIsDebuggerOpen = (isOpen: boolean) => setUiState({ isDebuggerOpen: isOpen });
  const setIsHistoryOpen = (isOpen: boolean) => setUiState({ isHistoryOpen: isOpen });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setIsSplitView(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Gesture Support
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && isSidebarVisible && setIsSidebarVisible) {
        setIsSidebarVisible(false);
    } else if (isRightSwipe && !isSidebarVisible && setIsSidebarVisible) {
        setIsSidebarVisible(true);
    }
    
    // Reset
    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  return (
    <div 
        className="flex-1 flex overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {isSidebarVisible && (
        <div 
          className="absolute inset-0 z-10 bg-transparent"
          onClick={() => setIsSidebarVisible && setIsSidebarVisible(false)}
        />
      )}
      <AnimatePresence mode="wait">
        {activeView === 'dashboard' ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex overflow-hidden w-full h-full absolute inset-0"
          >
            <Dashboard 
              project={generatedProject} 
              onSelectFile={(path) => {
                const file = generatedProject?.files.find(f => f.path === path);
                if (file) {
                  setSelectedFile(file);
                  setActiveView('preview');
                }
              }}
              onStartChat={async (prompt, type, engine) => {
                if (prompt) {
                  await confirmNewProject(type as 'web' | 'apk');
                  const fullPrompt = `[Project Type: ${type}]\n[Engine: ${engine}]\n\n${prompt}`;
                  
                  // Wait for React to update the project state before sending
                  setTimeout(() => {
                    setInput(fullPrompt);
                    handleSend(undefined, fullPrompt);
                  }, 100);
                }
                setActiveView('chat');
              }}
              onDeploy={onDeploy}
              isLoading={isLoading}
              agentActivities={agentActivities}
              onOpenManualInstruction={handleManualInstructionClick}
            />
          </motion.div>
        ) : isSplitView ? (
          <motion.div 
            key="split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex overflow-hidden w-full h-full absolute inset-0"
          >
            <ChatView 
              isSplitView={isSplitView}
              isLoading={isLoading}
              history={history}
              agentActivities={agentActivities}
              timer={timer}
              progress={progress}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              showSuggestions={showSuggestions}
              handleSuggestionClick={handleSuggestionClick}
              handleMicClick={handleMicClick}
              handleAttachClick={handleAttachClick}
              handlePlanningClick={handlePlanningClick}
              handleManualPlanningClick={handleManualPlanningClick}
              handleManualInstructionClick={handleManualInstructionClick}
              handleFileChange={handleFileChange}
              fileInputRef={fileInputRef}
              isLocalMode={isLocalMode}
              setIsLocalMode={setIsLocalMode}
              setShowSuggestions={setShowSuggestions}
              messagesEndRef={messagesEndRef}
              handleRestore={handleRestore}
              handleViewChanges={handleViewChanges}
              handleCancel={handleCancel}
              activeView={activeView}
              setActiveView={setActiveView}
              isMobile={isMobile}
              setIsSplitView={setIsSplitView}
              setIsHistoryOpen={setIsHistoryOpen}
              isBuildDisabled={isBuildDisabled}
              buildError={buildError}
              selectedFile={selectedFile}
            />
            <PreviewView 
              generatedProject={generatedProject} 
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              handleSaveSingleFile={handleSaveSingleFile}
              handleFileContentChange={handleFileContentChange}
              handleBuildApk={handleBuildApk}
              projectType={projectType}
              handleNewFile={handleNewFile}
              handleDeleteFile={handleDeleteFile}
              webProjectUrl={webProjectUrl}
              onRunWebContainer={onRunWebContainer}
              isWebContainerRunning={isWebContainerRunning}
              isDebuggerOpen={isDebuggerOpen}
              setIsDebuggerOpen={setIsDebuggerOpen}
              breakpoints={breakpoints}
              onToggleBreakpoint={onToggleBreakpoint}
              isSplitView={isSplitView}
              activeView={activeView}
              setActiveView={setActiveView}
              isMobile={isMobile}
              setIsSplitView={setIsSplitView}
            />
          </motion.div>
        ) : activeView === 'chat' ? (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex overflow-hidden w-full h-full absolute inset-0"
          >
            <ChatView 
              isSplitView={isSplitView}
              isLoading={isLoading}
              history={history}
              agentActivities={agentActivities}
              timer={timer}
              progress={progress}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              showSuggestions={showSuggestions}
              handleSuggestionClick={handleSuggestionClick}
              handleMicClick={handleMicClick}
              handleAttachClick={handleAttachClick}
              handlePlanningClick={handlePlanningClick}
              handleManualPlanningClick={handleManualPlanningClick}
              handleManualInstructionClick={handleManualInstructionClick}
              handleFileChange={handleFileChange}
              fileInputRef={fileInputRef}
              isLocalMode={isLocalMode}
              setIsLocalMode={setIsLocalMode}
              setShowSuggestions={setShowSuggestions}
              messagesEndRef={messagesEndRef}
              handleRestore={handleRestore}
              handleViewChanges={handleViewChanges}
              handleCancel={handleCancel}
              activeView={activeView}
              setActiveView={setActiveView}
              isMobile={isMobile}
              setIsSplitView={setIsSplitView}
              setIsHistoryOpen={setIsHistoryOpen}
              isBuildDisabled={isBuildDisabled}
              buildError={buildError}
              selectedFile={selectedFile}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex overflow-hidden w-full h-full absolute inset-0"
          >
            <PreviewView 
              generatedProject={generatedProject} 
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              handleSaveSingleFile={handleSaveSingleFile}
              handleFileContentChange={handleFileContentChange}
              handleBuildApk={handleBuildApk}
              projectType={projectType}
              handleNewFile={handleNewFile}
              handleDeleteFile={handleDeleteFile}
              webProjectUrl={webProjectUrl}
              onRunWebContainer={onRunWebContainer}
              isWebContainerRunning={isWebContainerRunning}
              isDebuggerOpen={isDebuggerOpen}
              setIsDebuggerOpen={setIsDebuggerOpen}
              breakpoints={breakpoints}
              onToggleBreakpoint={onToggleBreakpoint}
              isSplitView={isSplitView}
              activeView={activeView}
              setActiveView={setActiveView}
              isMobile={isMobile}
              setIsSplitView={setIsSplitView}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
