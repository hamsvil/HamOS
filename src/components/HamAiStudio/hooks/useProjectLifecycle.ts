 
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { safeStorage } from '../../../utils/storage';
import { projectService } from '../../../services/projectService';
import { ProjectData, ChatMessageData, ProjectFile, StudioUI } from '../types';

interface UseProjectLifecycleProps {
  generatedProject: ProjectData | null;
  setGeneratedProject: (project: ProjectData | null) => void;
  history: ChatMessageData[];
  setHistory: (history: ChatMessageData[]) => void;
  setInput: (input: string) => void;
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  setShowSuggestions: (show: boolean) => void;
  setProjectType: (type: 'web' | 'apk') => void;
  saveProjectToHistory: (project?: ProjectData, history?: ChatMessageData[]) => Promise<void>;
  saveProjectToDevice: (project?: ProjectData) => void;
  ui: StudioUI;
  setSelectedFile?: (file: ProjectFile | null) => void;
}

export function useProjectLifecycle({
  generatedProject, setGeneratedProject,
  history, setHistory,
  setInput,
  setActiveView,
  setShowSuggestions,
  setProjectType,
  saveProjectToHistory,
  saveProjectToDevice,
  ui,
  setSelectedFile
}: UseProjectLifecycleProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const confirmNewProject = async (type: 'web' | 'apk') => {
    window.dispatchEvent(new CustomEvent('ham-cancel-generation', { detail: { rollback: false } }));
    if (generatedProject) {
      await saveProjectToHistory(generatedProject, history);
    }

    const newProjectId = `proj_${Date.now()}`;
    setGeneratedProject({
      id: newProjectId,
      name: `New Project ${new Date().toLocaleTimeString()}`,
      files: []
    });
    const initialMessage: ChatMessageData = { 
      id: 'welcome',
      role: 'ai' as const, 
      content: type === 'apk' 
        ? 'Halo! Saya Ham Engine. Mode: **NATIVE ANDROID APK**. Saya siap membantu Anda membangun aplikasi Android native. Apa yang ingin kita buat?' 
        : 'Halo! Saya Ham Engine. Mode: **WEB APPLICATION**. Saya siap membantu Anda membangun aplikasi web modern. Apa yang ingin kita buat?' 
    };
    
    setHistory([initialMessage]);
    if (setSelectedFile) setSelectedFile(null);
    setInput('');
    setActiveView('chat');
    setShowSuggestions(true);

    setProjectType(type);
    safeStorage.setItem('ham_project_type', type);
    
    ui.setIsNewProjectModalOpen(false);
  };

  const handleNewProject = () => {
    ui.setIsNewProjectModalOpen(true);
  };

  const handleClearChat = async () => {
    if (await confirm("Are you sure you want to clear the chat history? This will not delete your project files.")) {
      window.dispatchEvent(new CustomEvent('ham-cancel-generation'));
      const initialMessage: ChatMessageData = { role: 'ai', content: 'Halo! Saya Ham Engine, asisten pengkodean bertenaga AI Anda. Bagaimana saya bisa membantu Anda membangun sesuatu hari ini?' };
      setHistory([initialMessage]);
      
      if (generatedProject) {
        const updatedProject = {
          ...generatedProject,
          chatHistory: [initialMessage]
        };
        setGeneratedProject(updatedProject);
        await saveProjectToHistory(updatedProject, [initialMessage]);
      } else {
        setInput('');
        setShowSuggestions(true);
      }
    }
  };

  const handleRestore = async (projectSnapshot: ProjectData) => {
    if (projectSnapshot && await confirm("Restore this project state? Current unsaved changes will be lost.")) {
      window.dispatchEvent(new CustomEvent('ham-cancel-generation'));
      setGeneratedProject(projectSnapshot);
      saveProjectToDevice(projectSnapshot);
      setActiveView('preview');
    }
  };

  return {
    confirmNewProject,
    handleNewProject,
    handleClearChat,
    handleRestore
  };
}
