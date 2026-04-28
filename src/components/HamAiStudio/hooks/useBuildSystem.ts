 
// [STABILITY] Promise chains verified
import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { FileSystemTree } from '@webcontainer/api';
import { ProjectData, AgentActivity } from '../types';
import { webcontainerService } from '../../../services/webcontainerService';
import { useToast } from '../../../context/ToastContext';
import { androidBuildService } from '../../../services/androidBuildService';
import { browserBuildService } from '../../../services/browserBuildService';
import { nativeBridge } from '../../../utils/nativeBridge';
import { NativeStorage } from '../../../plugins/NativeStorage';
import { EVENTS } from '../../../constants/events';
import { CDN_URLS } from '../../../constants/dependencies';

import { runBlobPreview } from '../utils/blobPreviewUtils';

import { vfs as vfsService } from '../../../services/vfsService';

interface UseBuildSystemProps {
  generatedProject: ProjectData | null;
  projectType: string;
  setWebProjectUrl: (url: string | null) => void;
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  setAgentActivities: React.Dispatch<React.SetStateAction<AgentActivity[]>>;
  setError: React.Dispatch<React.SetStateAction<{ title: string; message: string } | null>>;
  setIsApkBuilderOpen: (isOpen: boolean) => void;
}

interface FileSystemNode {
  directory?: Record<string, FileSystemNode>;
  file?: {
    contents: string;
  };
}

export function useBuildSystem({
  generatedProject,
  projectType,
  setWebProjectUrl,
  setActiveView,
  setAgentActivities,
  setError,
  setIsApkBuilderOpen
}: UseBuildSystemProps) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [isWebContainerRunning, setIsWebContainerRunning] = useState(false);
  const { showToast } = useToast();
  const fileChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleFileChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { path, content, project } = customEvent.detail;
      
      if (fileChangeTimeoutRef.current) clearTimeout(fileChangeTimeoutRef.current);

      fileChangeTimeoutRef.current = setTimeout(async () => {
        if (!webcontainerService.isBooted()) {
          // Regenerate Blob URL if WebContainer is not booted
          try {
            await runBlobPreview(project, setAgentActivities, setError, setWebProjectUrl);
          } catch (err: any) {
            console.error("Failed to regenerate Blob URL", err);
            showToast(`Gagal membuat ulang URL Blob: ${(err as Error).message}`, 'error');
          }
        }
      }, 300); // Debounce 300ms
    };

    window.addEventListener(EVENTS.FILE_CHANGED, handleFileChanged);
    return () => {
      window.removeEventListener(EVENTS.FILE_CHANGED, handleFileChanged);
      if (fileChangeTimeoutRef.current) clearTimeout(fileChangeTimeoutRef.current);
    };
  }, []);

  const handleExportZip = async (projectOverride?: ProjectData, selectedFiles?: Set<string>) => {
    const targetProject = projectOverride || generatedProject;
    if (!targetProject) return;

    setIsBuilding(true);
    setBuildStatus('building');
    setBuildLogs(["Preparing source code ZIP..."]);

    try {
      const zip = new JSZip();
      
      // Create package.json if missing (for consistency)
      if (!targetProject.files.some(f => f.path === 'package.json')) {
         zip.file('package.json', JSON.stringify({
          name: targetProject.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          version: '1.0.0',
          dependencies: {}
        }, null, 2));
      }

      targetProject.files.forEach(file => {
        if (!selectedFiles || selectedFiles.has(file.path)) {
            zip.file(file.path, file.content);
        }
      });
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${targetProject.name}-source.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);
      
      setBuildLogs(prev => [...prev, "SUCCESS: Source code ZIP downloaded."]);
      setBuildStatus('success');
      showToast("Source code exported successfully!", "success");
    } catch (e: any) {
      setBuildLogs(prev => [...prev, `EXPORT ERROR: ${(e as Error).message}`]);
      setBuildStatus('error');
      showToast("Export failed", "error");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleBuildApk = async (projectOverride?: ProjectData) => {
    const targetProject = projectOverride || generatedProject;
    if (!targetProject) return;

    if (projectType !== 'web') {
      setIsBuilding(true);
      setBuildStatus('building');
      setBuildLogs([]);

      // 1. Try Native Local Build (If running in Ham AI Studio APK)
      if (androidBuildService.isNativeAvailable()) {
        setBuildLogs(["Detected Native Environment."]);
        
        if (projectType === 'web') {
             setBuildLogs(prev => [...prev, "Starting Web-to-APK Native Conversion..."]);
             try {
                // For web projects, we need to "export" the dist folder first.
                // Since we don't have a real dist folder in memory, we simulate it by writing files to a temp location.
                // However, our native method expects a path.
                // Let's use the standard project path logic.
                
                // 1. Sync project files to native storage
                setBuildLogs(prev => [...prev, "Syncing web assets to native storage..."]);
                const projectPath = await androidBuildService.syncProjectFiles(targetProject, (msg) => {
                    setBuildLogs(prev => [...prev, msg]);
                });
                
                // 2. Call Web-to-APK Builder
                const apkPath = await androidBuildService.buildWebAppApk(projectPath, (msg) => {
                    setBuildLogs(prev => [...prev, msg]);
                });
                
                setBuildLogs(prev => [...prev, `SUCCESS: APK built at ${apkPath}`]);
                setBuildStatus('success');
                showToast("Web-to-APK Build Successful!", "success");
             } catch (e: any) {
                setBuildLogs(prev => [...prev, `WEB-TO-APK ERROR: ${(e as Error).message}`]);
                setBuildStatus('error');
                showToast("Web-to-APK Failed", "error");
             } finally {
                setIsBuilding(false);
             }
             return;
        }

        setBuildLogs(prev => [...prev, "Starting Local Gradle Build..."]);
        try {
          const apkPath = await androidBuildService.build(targetProject, (msg) => {
             setBuildLogs(prev => [...prev, msg]);
          });
          setBuildLogs(prev => [...prev, `SUCCESS: APK built at ${apkPath}`]);
          setBuildStatus('success');
          showToast("Native Build Successful!", "success");
        } catch (e: any) {
          setBuildLogs(prev => [...prev, `NATIVE BUILD ERROR: ${(e as Error).message}`]);
          setBuildStatus('error');
          showToast("Native Build Failed", "error");
        } finally {
          setIsBuilding(false);
        }
        return;
      }

      // 2. Try Browser-based Build (Source Export)
      setBuildLogs(prev => [...prev, "Native Bridge unavailable. Switching to Source Export..."]);
      try {
        const zipUrl = await browserBuildService.build(targetProject, (msg) => {
          setBuildLogs(prev => [...prev, msg]);
        });
        
        setBuildLogs(prev => [...prev, "SUCCESS: Source code exported!"]);
        setBuildStatus('success');
        showToast("Source Export Successful!", "success");
        
        // Trigger download
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `${targetProject.name}-source.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setIsBuilding(false);
        return;
      } catch (e: any) {
        setBuildLogs(prev => [...prev, `EXPORT ERROR: ${(e as Error).message}`]);
        setBuildLogs(prev => [...prev, "Falling back to legacy ZIP Export..."]);
      }

      // 3. Fallback to Source ZIP Export
      try {
        const zip = new JSZip();
        setBuildLogs(prev => [...prev, "Creating source ZIP..."]);
        
        if (!targetProject.files.some(f => f.path === 'package.json')) {
            zip.file('package.json', JSON.stringify({
              name: targetProject.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              version: '1.0.0',
              dependencies: {}
            }, null, 2));
        }

        targetProject.files.forEach(file => {
          zip.file(file.path, file.content);
        });
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `${targetProject.name}-source.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl);
        
        setBuildLogs(prev => [...prev, "SUCCESS: Source code downloaded."]);
        setBuildStatus('success');
        showToast("Source downloaded (Build failed)", "info");
      } catch (err: any) {
        setBuildLogs(prev => [...prev, `EXPORT ERROR: ${(err as Error).message}`]);
        setBuildStatus('error');
        showToast(`Export Failed: ${(err as Error).message}`, "error");
      } finally {
        setIsBuilding(false);
      }
      return;
    }

    if (projectType === 'web') {
      setIsBuilding(true);
      setBuildStatus('building');
      setBuildLogs([]);
      setBuildLogs(["Initializing build process...", "Target: Web Deployment"]);
      setBuildLogs(prev => [...prev, "Deploying Web Project locally..."]);
      try {
        await runBlobPreview(targetProject, setAgentActivities, setError, setWebProjectUrl);
        setBuildLogs(prev => [...prev, `SUCCESS: Web project running locally`]);
        setBuildStatus('success');
        setActiveView('preview');
        showToast(`Web project deployed! It's now running in the preview tab.`, 'success');
      } catch (err: any) {
        setBuildLogs(prev => [...prev, `Error: ${(err as Error).message}`]);
        setBuildStatus('error');
      } finally {
        setIsBuilding(false);
      }
    }
  };

  const handleRunWebContainer = async (projectOverride?: ProjectData) => {
    const targetProject = projectOverride || generatedProject;
    if (!targetProject) return;
    
    setIsWebContainerRunning(true);
    
    // If project is empty, force Blob preview to show the empty placeholder
    if (!targetProject.files || targetProject.files.length === 0) {
      try {
        await runBlobPreview(targetProject, setAgentActivities, setError, setWebProjectUrl);
      } catch (err: any) {
        console.error("Blob preview failed", err);
      }
      setIsWebContainerRunning(false);
      return;
    }

    // Bypass crossOriginIsolated check if running in Native Android environment
    const isNative = nativeBridge.isAvailable();
    
    if (!isNative && (typeof window === 'undefined' || !window.crossOriginIsolated)) {
      console.warn("crossOriginIsolated is false. Falling back to Blob URL preview.");
      try {
        await runBlobPreview(targetProject, setAgentActivities, setError, setWebProjectUrl);
      } catch (err: any) {
        console.error("Blob preview failed", err);
        showToast(`Gagal memuat preview Blob: ${(err as Error).message}`, 'error');
      }
      setIsWebContainerRunning(false);
      return;
    }

    setAgentActivities([{ id: 'wc-boot', type: 'action', title: 'WebContainer', details: 'Booting environment...', timestamp: Date.now() }]);
    
    if (isNative) {
        setAgentActivities([{ id: 'ns-start', type: 'action', title: 'NativeServer', details: 'Starting local server...', timestamp: Date.now() }]);
        try {
            // Sync files first using the refactored service
            const projectPath = await androidBuildService.syncProjectFiles(targetProject, (msg) => {
                // console.log(`[NativeSync] ${msg}`);
            });
            
            androidBuildService.startLocalServer(projectPath, 8080);
            setWebProjectUrl('http://localhost:8080');
            setAgentActivities([{ id: 'ns-run', type: 'action', title: 'NativeServer', details: 'Server running', timestamp: Date.now() }]);
            setIsWebContainerRunning(false);
            return;
        } catch (err: any) {
            console.error("Native server start failed", err);
            showToast(`Gagal menjalankan server native: ${(err as Error).message}`, 'error');
            // Fallback to WebContainer if native fails
        }
    }

    try {
      const files: FileSystemTree = {};
      targetProject.files.forEach(file => {
        const parts = file.path.split('/');
        let current: Record<string, FileSystemNode> = files as Record<string, FileSystemNode>;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = { directory: {} };
          }
          current = current[parts[i]].directory as Record<string, FileSystemNode>;
        }
        current[parts[parts.length - 1]] = {
          file: {
            contents: file.content
          }
        };
      });

      setAgentActivities([{ id: 'wc-mount', type: 'action', title: 'WebContainer', details: 'Mounting files...', timestamp: Date.now() }]);
      await webcontainerService.mount(files);

      webcontainerService.onServerReady((port, url) => {
        setWebProjectUrl(url);
        setAgentActivities([{ id: 'wc-run', type: 'action', title: 'WebContainer', details: 'Server running', timestamp: Date.now() }]);
        setIsWebContainerRunning(false);
      });

      const hasCachedDeps = await webcontainerService.restoreDependencies(targetProject.id);

      if (!hasCachedDeps) {
        setAgentActivities([{ id: 'wc-install', type: 'action', title: 'WebContainer', details: 'Installing dependencies...', timestamp: Date.now() }]);
        const installProcess = await webcontainerService.spawn('npm', ['install'], {
          env: {
            NODE_OPTIONS: '--max-old-space-size=4096'
          }
        });
        
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            // Log to terminal if needed
          }
        }));

        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          console.error('npm install failed');
          showToast('Instalasi dependensi gagal', 'error');
          setAgentActivities(prev => [...prev, { id: 'wc-fail', type: 'error', title: 'WebContainer', details: 'Install failed', timestamp: Date.now() }]);
          setError({
            title: 'Dependency Error',
            message: `Failed to install dependencies (exit code ${installExitCode}). Check terminal for details.`
          });
          setIsWebContainerRunning(false);
          return;
        }
        
        await webcontainerService.cacheDependencies(targetProject.id);
      } else {
        setAgentActivities([{ id: 'wc-cache', type: 'action', title: 'WebContainer', details: 'Dependencies restored from cache', timestamp: Date.now() }]);
      }

      setAgentActivities([{ id: 'wc-dev', type: 'action', title: 'WebContainer', details: 'Starting dev server...', timestamp: Date.now() }]);
      const startProcess = await webcontainerService.spawn('npm', ['run', 'dev'], {
        env: {
          NODE_OPTIONS: '--max-old-space-size=4096'
        }
      });
      
      startProcess.output.pipeTo(new WritableStream({
        write(data) {
          // Log to terminal if needed
        }
      }));

      // Monitor dev server exit
      startProcess.exit.then((code) => {
        if (code !== 0) {
          console.error(`Dev server exited with code ${code}`);
          showToast(`Server dev berhenti dengan kode ${code}`, 'error');
          setIsWebContainerRunning(false);
          setError({
            title: 'WebContainer Error',
            message: `Dev server crashed with exit code ${code}. Check terminal for details.`
          });
        }
      }).catch(err => {
        console.error('Failed to monitor dev server exit:', err);
      });

    } catch (err: any) {
      console.error('WebContainer error:', err);
      showToast(`Kesalahan WebContainer: ${(err as Error).message}`, 'error');
      console.warn("WebContainer failed. Falling back to Blob URL preview.");
      try {
        await runBlobPreview(targetProject, setAgentActivities, setError, setWebProjectUrl);
      } catch (fallbackErr: any) {
        setError({
          title: 'Preview Error',
          message: `WebContainer failed: ${(err as Error).message}. Fallback also failed: ${(fallbackErr as Error).message}`
        });
      }
      setIsWebContainerRunning(false);
    }
  };

  return {
    isBuilding,
    buildStatus,
    setBuildStatus,
    buildLogs,
    isWebContainerRunning,
    handleBuildApk,
    handleExportZip,
    handleRunWebContainer
  };
}
