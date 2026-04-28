 
import { useEffect } from 'react';
import { ProjectData, ProjectFile } from '../types';

export function useStudioShortcuts(
  selectedFile: ProjectFile | null,
  generatedProject: ProjectData | null,
  handleFileContentChange: (path: string, content: string) => void,
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (selectedFile && generatedProject) {
          const latestFile = generatedProject.files.find((f: ProjectFile) => f.path === selectedFile.path);
          if (latestFile) {
            handleFileContentChange(latestFile.path, latestFile.content);
          }
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, generatedProject, handleFileContentChange, setIsCommandPaletteOpen]);
}
