 
import React from 'react';
import { 
  Zap, Folder, Trash2, Settings, BarChart 
} from 'lucide-react';

const Github = ({ size }: { size?: number }) => <div style={{ width: size, height: size }} className="flex items-center justify-center font-bold">G</div>;
import { ProjectData, ProjectFile } from '../types';

interface UseStudioCommandsProps {
  selectedFile: ProjectFile | null;
  handleFileContentChange: (path: string, content: string) => void;
  handleNewFile: (name: string) => void;
  ui: any; // Keep UI as any for now
  handleClearChat: () => void;
  handleGitHubAutoSync: (project: ProjectData | null) => void;
  generatedProject: ProjectData | null;
}

export function useStudioCommands({
  selectedFile,
  handleFileContentChange,
  handleNewFile,
  ui,
  handleClearChat,
  handleGitHubAutoSync,
  generatedProject
}: UseStudioCommandsProps) {
  
  const commands = [
    { 
      id: 'save', 
      label: 'Save File', 
      shortcut: 'Ctrl+S', 
      icon: <Zap size={14} />, 
      action: () => { 
        if(selectedFile && generatedProject) {
          const latestFile = generatedProject.files.find((f: ProjectFile) => f.path === selectedFile.path);
          if (latestFile) {
            handleFileContentChange(latestFile.path, latestFile.content); 
          }
        }
      } 
    },
    { 
      id: 'new-file', 
      label: 'New File', 
      icon: <Folder size={14} />, 
      action: () => {
        const name = prompt("Enter file name (e.g., component.tsx):", "new_file.js");
        if (name) handleNewFile(name);
      }
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: <Settings size={14} />, 
      action: () => ui.setIsSettingsOpen(true) 
    },
    { 
      id: 'perf-overlay', 
      label: 'Toggle Performance Monitor', 
      icon: <BarChart size={14} />, 
      action: () => window.dispatchEvent(new CustomEvent('toggle-perf-overlay')) 
    },
    { 
      id: 'clear-chat', 
      label: 'Clear Chat History', 
      icon: <Trash2 size={14} />, 
      action: handleClearChat 
    },
    { 
      id: 'build-apk', 
      label: 'Build Native APK', 
      icon: <Zap size={14} />, 
      action: () => ui.setIsApkBuilderOpen(true) 
    },
    { 
      id: 'github-sync', 
      label: 'Sync to GitHub', 
      icon: <Github size={14} />, 
      action: () => handleGitHubAutoSync(generatedProject) 
    },
  ];

  return commands;
}
