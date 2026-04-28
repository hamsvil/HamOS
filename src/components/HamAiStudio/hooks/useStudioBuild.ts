 
import { useCallback, useRef, useEffect, useState } from 'react';
import { useProjectStore } from '../../../store/projectStore';
import { useBuildSystem } from './useBuildSystem';
import { useAutoHeal } from './useAutoHeal';
import { ProjectData, ChatMessageData, ProjectFile, AgentActivity } from '../types';
import { webcontainerService } from '../../../services/webcontainerService';
import { BuildHealer } from '../services/buildHealer';
import { NeuralContextService } from '../../../services/aiHub/core/NeuralContextService';
import { useToast } from '../../../context/ToastContext';

export function useStudioBuild(
  generatedProject: ProjectData | null,
  projectType: string,
  activeHandleSend: (e?: React.FormEvent, promptOverride?: string) => void,
  setAgentActivities: React.Dispatch<React.SetStateAction<AgentActivity[]>>,
  setError: (val: { title: string; message: string; } | null) => void,
  setIsApkBuilderOpen: (val: boolean) => void,
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void
) {
  const { showToast } = useToast();
  const webProjectUrl = useProjectStore(state => state.uiState.webProjectUrl);
  const selectedFile = useProjectStore(state => state.uiState.selectedFile);
  const [isBuildDisabled, setIsBuildDisabled] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const setWebProjectUrl = useCallback((url: string | null) => {
    useProjectStore.getState().setUiState({ webProjectUrl: url });
  }, []);

  const build = useBuildSystem({
    generatedProject,
    projectType,
    setWebProjectUrl,
    setActiveView,
    setAgentActivities,
    setError,
    setIsApkBuilderOpen
  });

  const autoHeal = useAutoHeal(generatedProject, activeHandleSend);
  const previewAttemptedRef = useRef(false);

  // Predictive Build Guard
  useEffect(() => {
    let isMounted = true;
    const checkSyntax = async () => {
      if (selectedFile?.content) {
        const error = await NeuralContextService.validateSyntax(selectedFile.content);
        if (!isMounted) return;
        if (error) {
          setIsBuildDisabled(true);
          setBuildError(`Syntax Error in ${selectedFile.path.split('/').pop()}: ${error}`);
        } else {
          setIsBuildDisabled(false);
          setBuildError(null);
        }
      } else {
        setIsBuildDisabled(false);
        setBuildError(null);
      }
    };

    const handler = setTimeout(checkSyntax, 500);
    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [selectedFile]);

  // Quantum Snapshot & Self-Healing
  const handleBuild = useCallback(async () => {
    if (isBuildDisabled) return;
    
    if (generatedProject?.files) {
      await BuildHealer.takeSnapshot(generatedProject.files);
    }

    try {
      if ('handleBuild' in build && typeof (build as any).handleBuild === 'function') {
        await (build as any).handleBuild();
      } else if ('handleBuildApk' in build && typeof (build as any).handleBuildApk === 'function') {
        await (build as any).handleBuildApk();
      }
    } catch (e: any) {
      const err = e as Error;
      const healedFiles = await BuildHealer.heal(err.message, generatedProject?.files || []);
      if (healedFiles) {
        // console.log('Self-healing successful, rolling back to stable state.');
        const currentProject = useProjectStore.getState().project;
        if (currentProject) {
            useProjectStore.getState().setProject({ ...currentProject, files: healedFiles });
        }
        showToast('Quantum Rollback successful. System healed.', 'success');
        setBuildError('Build failed but system auto-healed to a stable state.');
      }
      throw e;
    }
  }, [build, generatedProject?.files, isBuildDisabled]);

  useEffect(() => {
    if (generatedProject?.id) {
      setWebProjectUrl(null);
      webcontainerService.teardown();
      previewAttemptedRef.current = false;
    }
  }, [generatedProject?.id, setWebProjectUrl]);

  return {
    ...build,
    handleBuild,
    ...autoHeal,
    webProjectUrl,
    setWebProjectUrl,
    previewAttemptedRef,
    isBuildDisabled,
    buildError
  };
}
