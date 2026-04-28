 
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, X, Search, Package, GitBranch, Terminal } from 'lucide-react';
import { ProjectData, ProjectFile } from './types';
import { vfs } from '../../services/vfsService';
import FileTree from './FileTree';
import SearchPanel from './SearchPanel';
import PackageManager from './PackageManager/PackageManager';
import GitControlPanel from './Git/GitControlPanel';
import TerminalEmulator, { TerminalEmulatorHandle } from './TerminalEmulator';
import { webcontainerService } from '../../services/webcontainerService';
import { useToast } from '../../context/ToastContext';
import { safeStorage } from '../../utils/storage';

interface StudioSidePanelsProps {
  isSidebarVisible: boolean;
  activeSidePanel: 'none' | 'packages' | 'git' | 'search' | 'terminal';
  setActiveSidePanel: (panel: 'none' | 'packages' | 'git' | 'search' | 'terminal') => void;
  generatedProject: ProjectData | null;
  selectedFile: ProjectFile | null;
  setSelectedFile: (file: ProjectFile | null) => void;
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  setIsSidebarVisible: (visible: boolean) => void;
  handleNewFile: (path: string, isFolder?: boolean) => void;
  handleDeleteFile: (path: string) => void;
  handleRenameFile: (oldPath: string, newPath: string) => void;
  handleMoveFile: (sourcePath: string, targetPath: string) => void;
  handleDuplicateFile: (path: string) => void;
  handleFileContentChange: (path: string, content: string) => void;
  handleImportFiles: (files: { path: string, content: string }[]) => void;
  saveProjectToHistory: (project: ProjectData, history: any[]) => void;
  history: any[];
  githubRepoUrl: string | null;
  setGithubSyncStatus: (status: 'idle' | 'syncing' | 'success' | 'error') => void;
  setDiffData: (data: { path: string, oldContent: string, newContent: string } | null) => void;
}

export default function StudioSidePanels({
  isSidebarVisible,
  activeSidePanel,
  setActiveSidePanel,
  generatedProject,
  selectedFile,
  setSelectedFile,
  setActiveView,
  setIsSidebarVisible,
  handleNewFile,
  handleDeleteFile,
  handleRenameFile,
  handleMoveFile,
  handleDuplicateFile,
  handleFileContentChange,
  handleImportFiles,
  saveProjectToHistory,
  history,
  githubRepoUrl,
  setGithubSyncStatus,
  setDiffData
}: StudioSidePanelsProps) {
  const terminalRef = useRef<TerminalEmulatorHandle>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Redraw terminal when it becomes active
  useEffect(() => {
    if (activeSidePanel === 'terminal' && terminalRef.current) {
      const timer = setTimeout(() => {
        terminalRef.current?.redraw();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeSidePanel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSidebarVisible && 
        activeSidePanel === 'none' && 
        panelRef.current && 
        !panelRef.current.contains(event.target as Node)
      ) {
        // Check if click is on the sidebar toggle button (which is in StudioSidebar)
        // This is tricky without a shared ref or context, but usually the sidebar button stops propagation.
        // However, if the user clicks on "MainContent", we want to close.
        setIsSidebarVisible(false);
      }
    };

    const handleBlur = () => {
      if (document.activeElement?.tagName === 'IFRAME' && isSidebarVisible) {
        setIsSidebarVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isSidebarVisible, activeSidePanel, setIsSidebarVisible]);

  return (
    <AnimatePresence mode="wait">
      {isSidebarVisible && activeSidePanel === 'none' ? (
        <motion.div
          ref={panelRef}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden shrink-0 z-20"
        >
          <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
            <h3 className="text-xs font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
              <Folder size={14} className="text-blue-400" /> Project Files
            </h3>
            <button 
              onClick={() => setIsSidebarVisible(false)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {generatedProject ? (
              <FileTree 
                files={generatedProject.files} 
                selectedFile={selectedFile} 
                onSelectFile={(file) => {
                  setSelectedFile(file);
                  setActiveView('preview');
                  // Auto-close sidebar on file selection for better focus
                  setIsSidebarVisible(false);
                }} 
                onNewFile={handleNewFile}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onMoveFile={handleMoveFile}
                onDuplicateFile={handleDuplicateFile}
                onImportFiles={handleImportFiles}
              />
            ) : (
              <div className="p-4 text-xs text-gray-500 italic">No project loaded.</div>
            )}
          </div>
        </motion.div>
      ) : null}
      {activeSidePanel === 'search' ? (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden shrink-0 z-20"
        >
          <SearchPanel 
            project={generatedProject}
            onSelectFile={(path, line) => {
              if (generatedProject) {
                const file = generatedProject.files.find(f => f.path === path);
                if (file) {
                  setSelectedFile(file);
                  setActiveView('preview');
                  setIsSidebarVisible(false);
                }
              }
            }}
            onClose={() => setActiveSidePanel('none')}
            onReplaceAll={async (searchQuery, replaceQuery, matchCase, useRegex) => {
              if (!generatedProject) return;
              
              let searchRegex: RegExp | null = null;
              if (useRegex) {
                try {
                  searchRegex = new RegExp(searchQuery, matchCase ? 'g' : 'gi');
                } catch (e) {
                  showToast("Invalid Regular Expression", "error");
                  return;
                }
              } else {
                const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                searchRegex = new RegExp(escapedQuery, matchCase ? 'g' : 'gi');
              }
              
              let modifiedCount = 0;
              const updates: Promise<void>[] = [];

              generatedProject.files.forEach(file => {
                const lines = file.content.split('\n');
                let modified = false;
                
                const newLines = lines.map(lineContent => {
                  searchRegex!.lastIndex = 0;
                  if (searchRegex!.test(lineContent)) {
                    modified = true;
                    return lineContent.replace(searchRegex!, replaceQuery);
                  }
                  return lineContent;
                });
                
                if (modified) {
                  modifiedCount++;
                  updates.push(Promise.resolve(handleFileContentChange(file.path, newLines.join('\n'))));
                }
              });

              if (modifiedCount > 0) {
                try {
                  await Promise.all(updates);
                  showToast(`Replaced in ${modifiedCount} files.`, "success");
                } catch (e) {
                   console.error("Replace All Error", e);
                   showToast("Failed to apply some replacements.", "error");
                }
              } else {
                showToast("No matches found.", "info");
              }
            }}
          />
        </motion.div>
      ) : null}
      {activeSidePanel === 'terminal' ? (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 400, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden shrink-0 z-20"
        >
          <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
            <h3 className="text-xs font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
              <Terminal size={14} className="text-green-400" /> Native Shell
            </h3>
            <button 
              onClick={() => setActiveSidePanel('none')}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 bg-[#1e1e1e] overflow-hidden p-2">
            <TerminalEmulator ref={terminalRef} projectId={generatedProject?.id} />
          </div>
        </motion.div>
      ) : null}
      {activeSidePanel === 'packages' ? (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden shrink-0 z-20"
        >
          <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
            <h3 className="text-xs font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
              <Package size={14} className="text-orange-400" /> Packages
            </h3>
            <button 
              onClick={() => setActiveSidePanel('none')}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          </div>
          <PackageManager 
            project={generatedProject}
            onRunScript={async (scriptName) => {
              if (!generatedProject) return;
              showToast(`Running npm run ${scriptName}...`, 'info');
              try {
                const process = await webcontainerService.spawn('npm', ['run', scriptName]);
                process.output.pipeTo(new WritableStream({
                  write(data) {
                    if ((window as any).writeToTerminal) {
                      (window as any).writeToTerminal(data);
                    }
                  }
                }));
              } catch (e) {
                console.error(`Error running script ${scriptName}`, e);
                showToast(`Error running script ${scriptName}`, 'error');
              }
            }}
            onInstall={async (pkg) => {
              if (!generatedProject) return;
              showToast(`Installing ${pkg}...`, 'info');
              try {
                const process = await webcontainerService.spawn('npm', ['install', pkg]);
                process.output.pipeTo(new WritableStream({
                  write(data) {
                    if ((window as any).writeToTerminal) {
                      (window as any).writeToTerminal(data);
                    }
                  }
                }));
                const exitCode = await process.exit;
                if (exitCode === 0) {
                  showToast(`Successfully installed ${pkg}`, 'success');
                  const content = await webcontainerService.readFile('package.json');
                  handleFileContentChange('package.json', content);
                } else {
                  console.error(`Failed to install ${pkg}. Exit code: ${exitCode}`);
                  showToast(`Failed to install ${pkg}. Exit code: ${exitCode}`, 'error');
                }
              } catch (e: any) {
                console.error("WebContainer npm install error", e);
                showToast(`Gagal menginstal dependensi: ${e.message}`, 'error');
              }
            }}
            onUninstall={async (pkg) => {
              if (!generatedProject) return;
              showToast(`Uninstalling ${pkg}...`, 'info');
              try {
                const process = await webcontainerService.spawn('npm', ['uninstall', pkg]);
                process.output.pipeTo(new WritableStream({
                  write(data) {
                    if ((window as any).writeToTerminal) {
                      (window as any).writeToTerminal(data);
                    }
                  }
                }));
                const exitCode = await process.exit;
                if (exitCode === 0) {
                  showToast(`Successfully uninstalled ${pkg}`, 'success');
                  const content = await webcontainerService.readFile('package.json');
                  handleFileContentChange('package.json', content);
                } else {
                  console.error(`Failed to uninstall ${pkg}. Exit code: ${exitCode}`);
                  showToast(`Failed to uninstall ${pkg}. Exit code: ${exitCode}`, 'error');
                }
              } catch (e) {
                console.error("WebContainer npm uninstall error", e);
                showToast("Failed to uninstall package", "error");
              }
            }}
          />
        </motion.div>
      ) : null}
      {activeSidePanel === 'git' ? (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden shrink-0 z-20"
        >
          <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
            <h3 className="text-xs font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
              <GitBranch size={14} className="text-purple-400" /> Source Control
            </h3>
            <button 
              onClick={() => setActiveSidePanel('none')}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          </div>
          <GitControlPanel 
            project={generatedProject}
            onCommit={async (msg) => {
              if (generatedProject) {
                try {
                  await vfs.commit('.', msg, { name: 'Ham User', email: 'user@ham.ai' });
                  saveProjectToHistory(generatedProject, history);
                  showToast("Changes committed successfully.", "success");
                } catch (e: any) {
                  console.error("Git commit failed", e);
                  showToast(`Commit failed: ${e.message}`, "error");
                }
              }
            }}
            onPush={async () => {
              const remoteUrl = safeStorage.getItem('ham_git_remote');
              const token = safeStorage.getItem('github_pat');
              if (remoteUrl && token) {
                setGithubSyncStatus('syncing');
                try {
                  await vfs.push('.', remoteUrl, token);
                  setGithubSyncStatus('success');
                  showToast("Pushed to remote successfully.", "success");
                } catch (e: any) {
                  console.error("Git push failed", e);
                  setGithubSyncStatus('error');
                  showToast(`Push failed: ${e.message}`, "error");
                }
              } else {
                showToast("No remote or token configured. Please check settings.", "warning");
              }
            }}
            onPull={async () => {
              const remoteUrl = safeStorage.getItem('ham_git_remote');
              const token = safeStorage.getItem('github_pat');
              if (remoteUrl && token) {
                setGithubSyncStatus('syncing');
                try {
                  await vfs.pull('.', remoteUrl, token);
                  setGithubSyncStatus('success');
                  showToast("Pulled from remote successfully. Reloading...", "success");
                  // Trigger a reload or re-fetch of project files
                  window.location.reload(); 
                } catch (e: any) {
                  console.error("Git pull failed", e);
                  setGithubSyncStatus('error');
                  showToast(`Pull failed: ${e.message}`, "error");
                }
              } else {
                showToast("No remote or token configured. Please check settings.", "warning");
              }
            }}
            onViewDiff={(path, oldContent, newContent) => {
              setDiffData({ path, oldContent, newContent });
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
