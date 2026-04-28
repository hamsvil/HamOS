import React from 'react';
import { MessageSquare, Play, Layout, LayoutDashboard } from 'lucide-react';
import ProjectPreview from './ProjectPreview';
import { ProjectData, ProjectFile } from './types';

interface PreviewViewProps {
  generatedProject: ProjectData | null;
  selectedFile: ProjectFile | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<ProjectFile | null>>;
  handleSaveSingleFile: (path: string, content: string) => void;
  handleFileContentChange: (path: string, content: string) => void;
  handleBuildApk: () => void;
  projectType: string;
  handleNewFile: (path: string, isFolder?: boolean) => void;
  handleDeleteFile: (path: string) => void;
  webProjectUrl: string | null;
  onRunWebContainer?: () => void;
  isWebContainerRunning?: boolean;
  isDebuggerOpen: boolean;
  setIsDebuggerOpen: (isOpen: boolean) => void;
  breakpoints: Record<string, number[]>;
  onToggleBreakpoint: (path: string, line: number) => void;
  isSplitView: boolean;
  activeView: 'chat' | 'preview' | 'dashboard';
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  isMobile: boolean;
  setIsSplitView: (isSplit: boolean) => void;
}

export default function PreviewView({
  generatedProject, selectedFile, setSelectedFile, handleSaveSingleFile, handleFileContentChange,
  handleBuildApk, projectType, handleNewFile, handleDeleteFile, webProjectUrl, onRunWebContainer,
  isWebContainerRunning, isDebuggerOpen, setIsDebuggerOpen, breakpoints, onToggleBreakpoint,
  isSplitView, activeView, setActiveView, isMobile, setIsSplitView
}: PreviewViewProps) {
  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[var(--bg-primary)]">
       <div className="flex-1 overflow-hidden relative">
         <ProjectPreview 
           generatedProject={generatedProject} 
           selectedFile={selectedFile}
           setSelectedFile={setSelectedFile}
           onSaveFile={handleSaveSingleFile}
           onFileContentChange={handleFileContentChange}
           onBuildApk={handleBuildApk}
           projectType={projectType}
           onNewFile={handleNewFile}
           onDeleteFile={handleDeleteFile}
           webProjectUrl={webProjectUrl}
           onRunWebContainer={onRunWebContainer}
           isWebContainerRunning={isWebContainerRunning}
           isDebuggerOpen={isDebuggerOpen}
           setIsDebuggerOpen={setIsDebuggerOpen}
           breakpoints={breakpoints}
           onToggleBreakpoint={onToggleBreakpoint}
         />
       </div>
       
       {!isSplitView && (
         <div className="shrink-0 border-t-2 border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 z-50 flex justify-center gap-2">
            <div className="bg-[var(--bg-tertiary)] p-1 rounded-full border border-[var(--border-color)] flex items-center shadow-sm w-full max-w-md">
              <button 
                onClick={() => setActiveView('dashboard')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${activeView === 'dashboard' ? 'bg-purple-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
              >
                <LayoutDashboard size={14} />
                Dash
              </button>
              <button 
                onClick={() => setActiveView('chat')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${activeView === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
              >
                <MessageSquare size={14} />
                Chat
              </button>
              <button 
                onClick={() => setActiveView('preview')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${activeView === 'preview' ? 'bg-green-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
              >
                <Play size={14} />
                Preview
              </button>
            </div>
            {!isMobile && (
              <button 
                onClick={() => setIsSplitView(!isSplitView)}
                className={`p-3 rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all`}
                title="Split View"
              >
                <Layout size={18} />
              </button>
            )}
         </div>
       )}
    </div>
  );
}
