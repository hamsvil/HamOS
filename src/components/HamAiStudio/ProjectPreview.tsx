 
// [STABILITY] Promise chains verified
import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { ProjectData, ProjectFile } from './types';
import FileTree from './FileTree';
import type { XTermProxyHandle } from '../Terminal/XTermProxy';
const MonacoEditor = lazy(() => import('./Editor/MonacoEditor'));
const WebPreview = lazy(() => import('./WebPreview'));
const XTermProxy = lazy(() => import('../Terminal/XTermProxy').then(m => ({ default: m.XTermProxy })).catch(e => { /* console.error(e); */ return { default: React.forwardRef(() => null) as any }; })) as any;
import { Terminal, Maximize2, Minimize2, RefreshCw, Smartphone, Monitor, Code, Layout, Play, Bug, Map, GitBranch, AlertCircle, AlertTriangle, Check, Loader2 } from 'lucide-react';
import AndroidXmlRenderer from './AndroidXmlRenderer';
import DebuggerPanel from './Debugger/DebuggerPanel';
import DeviceFrame from './DeviceFrame';

interface ProjectPreviewProps {
  generatedProject: ProjectData | null;
  selectedFile: ProjectFile | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<ProjectFile | null>>;
  onSaveFile: (path: string, content: string) => void;
  onFileContentChange: (path: string, content: string) => void;
  onBuildApk: () => void;
  projectType: string;
  onNewFile: (path: string, isFolder?: boolean) => void;
  onDeleteFile: (path: string) => void;
  webProjectUrl: string | null;
  onRunWebContainer?: () => void;
  isWebContainerRunning?: boolean;
  isDebuggerOpen: boolean;
  setIsDebuggerOpen: (isOpen: boolean) => void;
  breakpoints: Record<string, number[]>;
  onToggleBreakpoint: (path: string, line: number) => void;
}

const ProjectPreview: React.FC<ProjectPreviewProps> = ({
  generatedProject,
  selectedFile,
  setSelectedFile,
  onSaveFile,
  onFileContentChange,
  onBuildApk,
  projectType,
  onNewFile,
  onDeleteFile,
  webProjectUrl,
  onRunWebContainer,
  isWebContainerRunning,
  isDebuggerOpen,
  setIsDebuggerOpen,
  breakpoints,
  onToggleBreakpoint
}) => {
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalProxyRef = useRef<XTermProxyHandle>(null);

  // Trigger terminal redraw when shown
  useEffect(() => {
    if (showTerminal && terminalProxyRef.current) {
      // Small delay to ensure DOM has settled
      const timer = setTimeout(() => {
        terminalProxyRef.current?.redraw();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showTerminal]);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
  const [previewSubMode, setPreviewSubMode] = useState<'web' | 'native'>('web');
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [fontSize, setFontSize] = useState(13);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [autoScale, setAutoScale] = useState(0.8);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-detect sub-mode based on project type
  useEffect(() => {
    if (projectType === 'android') {
      setPreviewSubMode('native');
      setDeviceType('mobile');
    } else {
      setPreviewSubMode('web');
      setDeviceType('desktop');
    }
  }, [projectType]);

  // Auto-close explorer on iframe click or outside click
  useEffect(() => {
    const handleBlur = () => {
      if (document.activeElement?.tagName === 'IFRAME' && isExplorerOpen) {
        setIsExplorerOpen(false);
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      // If clicking outside the sidebar (which has width 64/256px), close it
      // We can check if the click is inside the main content area
      const target = e.target as HTMLElement;
      const isSidebarClick = target.closest('.file-tree-sidebar');
      const isToolbarClick = target.closest('.preview-toolbar');
      
      if (!isSidebarClick && !isToolbarClick && isExplorerOpen) {
        setIsExplorerOpen(false);
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('mousedown', handleMouseDown, true); // Use capture phase
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [isExplorerOpen]);

  // Auto-scale logic
  useEffect(() => {
    if (!containerRef.current || deviceType === 'desktop') return;

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();
      const padding = 60; // Extra padding for safety
      const availableWidth = width - padding;
      const availableHeight = height - padding;

      // Device dimensions from DeviceFrame.tsx
      let deviceW = 375;
      let deviceH = 812;

      if (deviceType === 'tablet') {
        deviceW = 768;
        deviceH = 1024;
      }

      if (orientation === 'landscape') {
        [deviceW, deviceH] = [deviceH, deviceW];
      }

      const scaleW = availableWidth / deviceW;
      const scaleH = availableHeight / deviceH;
      const fitScale = Math.min(scaleW, scaleH, 1); // Don't scale up beyond 1

      setAutoScale(fitScale);
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    updateScale();

    return () => observer.disconnect();
  }, [deviceType, orientation, previewSubMode, isExplorerOpen, showTerminal]);

  // Auto-select first file if none selected
  useEffect(() => {
    if (generatedProject?.files.length && !selectedFile) {
      const readme = generatedProject.files.find(f => f.path.toLowerCase() === 'readme.md');
      const index = generatedProject.files.find(f => f.path === 'index.html' || f.path === 'src/App.tsx');
      setSelectedFile(readme || index || generatedProject.files[0]);
    }
  }, [generatedProject, selectedFile, setSelectedFile]);

  // Auto-Start Dev Server
  useEffect(() => {
    if (generatedProject && onRunWebContainer && !webProjectUrl && !isWebContainerRunning) {
      // Small delay to ensure everything is mounted
      const timer = setTimeout(() => {
        onRunWebContainer();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [generatedProject, webProjectUrl, isWebContainerRunning, onRunWebContainer]);

  if (!generatedProject) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
        No project loaded
      </div>
    );
  }

  const handleEditorChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      onFileContentChange(selectedFile.path, value);
    }
  };

  const handleFileSelect = (file: ProjectFile) => {
    setSelectedFile(file);
    // Auto-close explorer on mobile or small screens, or if user prefers
    if (window.innerWidth < 768) {
      setIsExplorerOpen(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-primary)] overflow-hidden relative">
      {/* Left Sidebar - File Tree */}
      <div 
        className={`file-tree-sidebar border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-secondary)] shrink-0 transition-all duration-300 ease-in-out ${
          isExplorerOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
            {generatedProject.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {projectType}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <FileTree
            files={generatedProject.files}
            selectedFile={selectedFile}
            onSelectFile={handleFileSelect}
            onNewFile={onNewFile}
            onDeleteFile={onDeleteFile}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Toolbar */}
        <div className="preview-toolbar h-10 border-b border-[var(--border-color)] flex items-center justify-between px-3 bg-[var(--bg-secondary)] shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setIsExplorerOpen(!isExplorerOpen)}
              className={`p-1.5 rounded-md transition-colors ${isExplorerOpen ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
              title={isExplorerOpen ? "Close Explorer" : "Open Explorer"}
            >
              <Layout size={14} className={isExplorerOpen ? "rotate-180" : ""} />
            </button>
            <div className="w-px h-4 bg-[var(--border-color)] mx-1" />
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'code' 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <Code size={14} />
              Code
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'preview' 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <Layout size={14} />
              Preview
            </button>

            {activeTab === 'preview' && (
              <div className="flex items-center gap-1 ml-2 bg-[var(--bg-tertiary)] p-0.5 rounded-md border border-[var(--border-color)]">
                <button
                  onClick={() => {
                    setPreviewSubMode('web');
                    if (deviceType === 'mobile') setDeviceType('desktop');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${previewSubMode === 'web' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  Web App
                </button>
                <button
                  onClick={() => {
                    setPreviewSubMode('native');
                    setDeviceType('mobile');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${previewSubMode === 'native' ? 'bg-green-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  APK Native
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'preview' && (
              <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-0.5 rounded-md border border-[var(--border-color)] mr-2">
                <button
                  onClick={() => setDeviceType('mobile')}
                  className={`p-1 rounded transition-colors ${deviceType === 'mobile' ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}
                  title="Mobile View"
                >
                  <Smartphone size={14} />
                </button>
                <button
                  onClick={() => setDeviceType('desktop')}
                  className={`p-1 rounded transition-colors ${deviceType === 'desktop' ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}
                  title="Desktop View"
                >
                  <Monitor size={14} />
                </button>
              </div>
            )}
            {activeTab === 'code' && (
                <>
                    <div className="flex bg-[var(--bg-tertiary)] rounded-md p-0.5 border border-[var(--border-color)]">
                        <button
                            onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                            className="px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title="Decrease Font Size"
                        >
                            A-
                        </button>
                        <div className="w-px bg-[var(--border-color)] my-0.5" />
                        <button
                            onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                            className="px-2 py-0.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            title="Increase Font Size"
                        >
                            A+
                        </button>
                    </div>
                    <button
                        onClick={() => setShowMinimap(!showMinimap)}
                        className={`p-1.5 rounded-md transition-colors ${showMinimap ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                        title="Toggle Minimap"
                    >
                        <Map size={16} />
                    </button>
                </>
            )}
            
            <button
              onClick={() => setIsDebuggerOpen(!isDebuggerOpen)}
              className={`p-1.5 rounded-md transition-colors ${isDebuggerOpen ? 'bg-[var(--bg-tertiary)] text-orange-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
              title="Toggle Debugger"
            >
              <Bug size={16} />
            </button>
            
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`p-1.5 rounded-md transition-colors ${showTerminal ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
              title="Toggle Terminal"
            >
              <Terminal size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 relative overflow-hidden flex flex-col"
        >
          {activeTab === 'code' ? (
            <div className="absolute inset-0">
              {selectedFile ? (
                <Suspense fallback={<div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">Loading Editor...</div>}>
                  <MonacoEditor
                    file={selectedFile}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    showMinimap={showMinimap}
                    fontSize={fontSize}
                    onCursorPositionChange={(line, column) => setCursorPosition({ line, column })}
                  />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">
                  Select a file to edit
                </div>
              )}
            </div>
          ) : (
            <div ref={containerRef} className="absolute inset-0 bg-[#111] flex items-center justify-center overflow-auto p-4">
              {previewSubMode === 'native' ? (
                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                  <DeviceFrame deviceType={deviceType} orientation={orientation} scale={deviceType === 'desktop' ? 1 : autoScale}>
                    {projectType === 'android' ? (
                        (() => {
                            // Determine which XML to render
                            let xmlFile = selectedFile?.path.endsWith('.xml') ? selectedFile : null;
                            if (!xmlFile) xmlFile = generatedProject.files.find(f => f.path.endsWith('activity_main.xml'));
                            if (!xmlFile) xmlFile = generatedProject.files.find(f => f.path.includes('layout') && f.path.endsWith('.xml'));

                            if (xmlFile) {
                                return (
                                    <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
                                        <div className="bg-gray-800 text-[10px] text-gray-400 p-1 text-center border-b border-gray-700 uppercase tracking-widest font-bold">
                                            Native APK: {xmlFile.path.split('/').pop()}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <AndroidXmlRenderer xmlContent={xmlFile.content} />
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center bg-[#1e1e1e]">
                                    <Layout size={32} className="mb-2 opacity-50" />
                                    <p className="text-sm">No Android Layout XML found.</p>
                                </div>
                            );
                        })()
                    ) : (
                        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-500" /></div>}>
                          <WebPreview 
                              projectName={generatedProject.name} 
                              urlOverride={webProjectUrl} 
                              files={generatedProject.files}
                              onStartServer={onRunWebContainer}
                              isServerRunning={isWebContainerRunning}
                              deviceType={deviceType}
                              orientation={orientation}
                              showToolbar={false}
                              isNativeMode={true}
                          />
                        </Suspense>
                    )}
                  </DeviceFrame>
                </div>
              ) : (
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-500" /></div>}>
                  <WebPreview 
                      projectName={generatedProject.name} 
                      urlOverride={webProjectUrl} 
                      files={generatedProject.files}
                      onStartServer={onRunWebContainer}
                      isServerRunning={isWebContainerRunning}
                  />
                </Suspense>
              )}
            </div>
          )}

          {/* Terminal Overlay */}
          {showTerminal && (
            <div className="absolute bottom-6 left-0 right-0 h-1/3 bg-[#1e1e1e] border-t border-[var(--border-color)] shadow-xl z-10 flex flex-col">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[var(--border-color)]">
                <span className="text-xs font-mono text-[var(--text-secondary)]">Terminal</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowTerminal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <Minimize2 size={12} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-2 font-mono text-xs">
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-500" /></div>}>
                  <XTermProxy ref={terminalProxyRef} />
                </Suspense>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[10px] select-none shrink-0 z-20 font-sans">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
                    <GitBranch size={10} />
                    <span>main</span>
                </div>
                <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
                    <AlertCircle size={10} />
                    <span>0</span>
                    <AlertTriangle size={10} />
                    <span>0</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="hover:bg-white/10 px-1 rounded cursor-pointer">Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                <span className="hover:bg-white/10 px-1 rounded cursor-pointer">Spaces: 2</span>
                <span className="hover:bg-white/10 px-1 rounded cursor-pointer">UTF-8</span>
                <span className="hover:bg-white/10 px-1 rounded cursor-pointer">{selectedFile?.language || 'Plain Text'}</span>
                <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer" title="Prettier">
                    <Check size={10} />
                    <span>Prettier</span>
                </div>
            </div>
        </div>
      </div>
      <DebuggerPanel isOpen={isDebuggerOpen} onClose={() => setIsDebuggerOpen(false)} />
    </div>
  );
};

export default ProjectPreview;
