 
/* eslint-disable no-useless-escape */
import { useEffect, useRef } from 'react';
import { useToast } from '../../../context/ToastContext';
import { projectService } from '../../../services/projectService';
import { useProjectStore } from '../../../store/projectStore';
import { useAIHubStore } from '../../../store/aiHubStore';
import { ProjectData, ProjectFile } from '../types';
import { safeStorage } from '../../../utils/storage';
import { BuildHealer } from '../services/buildHealer';

export function useAutoHeal(generatedProject: ProjectData | null, handleSend: (e?: React.FormEvent, prompt?: string) => void) {
  const { showToast } = useToast();
  const previewErrors = useProjectStore(state => state.previewErrors);
  const clearPreviewErrors = useProjectStore(state => state.clearPreviewErrors);
  const autoHealAttempts = useRef(0);
  const lastHealTime = useRef(0);

  useEffect(() => {
    const triggerHeal = async (errorText: string, isAttempt: boolean = false) => {
      if (!generatedProject) return;
      
      const now = Date.now();
      if (isAttempt && now - lastHealTime.current < 10000) return;
      
      if (!isAttempt || autoHealAttempts.current < 3) {
        if (isAttempt) autoHealAttempts.current++;
        lastHealTime.current = now;
        
        // Extract potential file paths from error message
        const pathRegex = /(?:\/src\/|src\/)[a-zA-Z0-9._\-\/]+/g;
        const matches = errorText.match(pathRegex) || [];
        const uniquePaths = Array.from(new Set(matches)).slice(0, 5); // Limit to 5 files
        
        let fileContext = "";
        if (uniquePaths.length > 0) {
          fileContext = "\n\n[FILE CONTEXT FOR ANALYSIS]:\n";
          for (const path of uniquePaths) {
            // Normalize path for comparison
            const normalizedPath = path.startsWith('/') ? path : `/${path}`;
            const file = generatedProject.files.find(f => {
              const fPath = f.path.startsWith('/') ? f.path : `/${f.path}`;
              return fPath === normalizedPath;
            });

            if (file) {
              fileContext += `\nFile: ${path}\n\`\`\`\n${file.content}\n\`\`\`\n`;
            }
          }
        }

        const prompt = isAttempt 
          ? `[AUTO-HEAL ATTEMPT ${autoHealAttempts.current}/3]\nTerjadi error saat kompilasi/runtime di preview:\n\n\`\`\`\n${errorText}\n\`\`\`${fileContext}\n\nTolong analisis dan perbaiki error ini tanpa intervensi pengguna.`
          : `Sistem mengalami crash dengan error berikut:\n\n\`\`\`\n${errorText}\n\`\`\`${fileContext}\n\nTolong perbaiki bug ini di project ${generatedProject.name}.`;
        
        if (isAttempt) showToast(`Auto-Heal Attempt ${autoHealAttempts.current}/3 initiated...`, 'warning');
        clearPreviewErrors();
        
        // Use real BuildHealer if available
        try {
          const healedFiles = await BuildHealer.heal(errorText, generatedProject.files);
          if (healedFiles) {
            showToast("BuildHealer successfully patched the project.", "success");
          }
        } catch (e) {
          console.error("BuildHealer failed:", e);
        }

        setTimeout(() => {
          handleSend(undefined, prompt);
        }, 1000);
      } else {
        showToast("Auto-Heal gagal setelah 3 percobaan. Silakan periksa error secara manual.", "error");
        clearPreviewErrors();
        autoHealAttempts.current = 0;
      }
    };

    const pendingError = safeStorage.getItem('ham_pending_auto_heal');
    if (pendingError && generatedProject) {
      safeStorage.removeItem('ham_pending_auto_heal');
      triggerHeal(pendingError, false);
    }

    if (previewErrors.length > 0 && generatedProject) {
      triggerHeal(previewErrors.join('\n'), true);
    }
  }, [previewErrors, generatedProject, handleSend, clearPreviewErrors, showToast]);

  const handleGlobalAutoHeal = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorDetails = `${error.toString()}\n${errorInfo.componentStack}`.substring(0, 4000);
    safeStorage.setItem('ham_pending_auto_heal', errorDetails);
    if (generatedProject) {
        projectService.saveProject({
            id: generatedProject.id,
            name: generatedProject.name,
            timestamp: Date.now(),
            data: generatedProject,
            chatHistory: generatedProject.chatHistory || []
        }).finally(() => {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
  };

  const handleGlobalRollback = async () => {
    if (!generatedProject) return;
    try {
      useAIHubStore.getState().rollback();
      showToast("State rolled back to last snapshot.", "info");

      const snapshots = await projectService.getSnapshots(generatedProject.id);
      if (snapshots && snapshots.length > 0) {
        const latestSnapshot = snapshots[0] as any;
        const currentProject = await projectService.getProject(generatedProject.id);
        await projectService.saveProject({
          id: generatedProject.id,
          name: generatedProject.name,
          data: latestSnapshot.data,
          timestamp: Date.now(),
          chatHistory: currentProject?.chatHistory || []
        });
        
        const vfs = (await import('../../../services/vfsService')).vfs;
        const currentFiles = await vfs.getProjectSnapshot() as any;
        await vfs.bulkDelete(currentFiles.files.map((f: any) => f.path));
        
        const filesToSave = latestSnapshot.data.files.map((file: ProjectFile) => ({
          path: file.path.startsWith('/') ? file.path : `/${file.path}`,
          content: file.content
        }));
        await vfs.bulkWrite(filesToSave);
        
        const nativeBridge = (await import('../../../utils/nativeBridge')).nativeBridge;
        if (nativeBridge.isAvailable()) {
            const NativeStorage = (await import('../../../plugins/NativeStorage')).NativeStorage;
            const { path: dataDir } = await NativeStorage.getInternalDataDirectory();
            const projectId = generatedProject.id || 'default';
            const projectRoot = `${dataDir}/projects/${projectId}`;
            
            const nativeFiles = filesToSave
                .filter((f: { path: string; content: string }) => f.content !== undefined && f.content !== null)
                .map((f: { path: string; content: string }) => ({
                    path: `${projectRoot}/${f.path.startsWith('/') ? f.path.substring(1) : f.path}`,
                    data: f.content || ""
                }));
            
            await NativeStorage.bulkWrite({ files: nativeFiles });
        }

        showToast("Berhasil rollback ke snapshot terakhir.", "success");
        window.location.reload();
      } else {
        showToast("Tidak ada snapshot tersedia.", "error");
      }
    } catch (e) {
      console.error("Rollback failed", e);
      showToast("Gagal melakukan rollback.", "error");
    }
  };

  return {
    handleGlobalAutoHeal,
    handleGlobalRollback
  };
}
