 
import { useCallback } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useFileOperations } from './useFileOperations';
import { useFileInput } from './useFileInput';
import { useDeepScan } from './useDeepScan';
import { ProjectData, ProjectFile } from '../types';

export function useStudioFiles(
  generatedProject: ProjectData | null,
  setGeneratedProject: (project: ProjectData | null) => void,
  setActiveInput: (input: string) => void
) {
  const selectedFile = useProjectStore(state => state.uiState.selectedFile);
  const setSelectedFile = useCallback((file: ProjectFile | null) => {
    useProjectStore.getState().setUiState({ selectedFile: file });
  }, []);

  const fileOps = useFileOperations({
    generatedProject,
    setGeneratedProject,
    selectedFile,
    setSelectedFile
  });

  const deepScan = useDeepScan();
  const fileInput = useFileInput(setActiveInput);

  return {
    selectedFile,
    setSelectedFile,
    ...fileOps,
    ...deepScan,
    ...fileInput
  };
}
