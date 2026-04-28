import { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useAppInitialization } from './useAppInitialization';
import { useSystemState } from './useSystemState';
import { useTabManager } from './useTabManager';
import { useTaskStore } from '../store/taskStore';
import { ErrorInterceptor } from '../HAS/interceptor';
import { SecureVault } from '../HAS/SecureVault';
import { EnvironmentChecker } from '../services/environmentChecker';
import { initStorage } from '../utils/storage';
import { structuredDb } from '../db/structuredDb';
import { vfs } from '../services/vfsService';
import { AutoResumeManager } from '../services/runtime/AutoResumeManager';
import { VectorStore } from '../services/vectorStore';
import { webcontainerService, webContainerBootstrapper } from '../services/webcontainerService';

export function useInitializeApp() {
  const { showToast } = useToast();
  const init = useAppInitialization();
  const system = useSystemState();
  const tabs = useTabManager();
  const { setBgInit } = useTaskStore();

  const isNativeRef = useRef(false);
  const lastProgressRef = useRef(0);
  const progressStuckCounterRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    // SAERE v7.2 Boot
    ErrorInterceptor.boot();
    SecureVault.initialize('SAERE_MASTER_INIT');

    // [SELF-HEALING] Anti-Blank Screen Watchdog
    const progressWatchdog = setInterval(() => {
      if (!isMounted || init.isInitialized) return;
      
      if (init.progress === lastProgressRef.current && init.progress < 100) {
        progressStuckCounterRef.current += 1;
        // If stuck for 30s (assuming check every 10s)
        if (progressStuckCounterRef.current >= 3) {
          console.warn('[ABX] System stuck detected at %d percent. Triggering pre-emptive healing...', init.progress);
          init.setLoadingStatus('System detected a bottleneck. Attempting soft-repair...');
          // Soft repair logic (internal resets)
          vfs.initialize().catch(() => {});
        }
      } else {
        lastProgressRef.current = init.progress;
        progressStuckCounterRef.current = 0;
      }
    }, 10000);
    
    // Neural & State Sync Boot
    import('../HAS/StateRehydrator').then(m => m.StateRehydrator.boot());
    import('../HAS/QuantumSync').then(m => m.QuantumSync.boot());
    import('../HAS/SemanticNeuralPatcher').then(m => m.SemanticNeuralPatcher.load());

    const initApp = async () => {
      if (init.isInitialized) return;

      const forceStartTimer = setTimeout(() => {
        if (isMounted) {
          init.setShowForceStart(true);
          init.setLoadingStatus('Initialization taking longer than expected...');
        }
      }, 20_000);

      const healApp = async () => {
         console.warn('[ABX] Critical Healing: Clearing transient initialization state.');
         localStorage.removeItem('ham_active_session');
         // Keep project data but clear volatile layout/cache that might cause crashes
         localStorage.removeItem('ham_last_tab');
         sessionStorage.clear();
      };

      try {
        init.setLoadingStatus('Checking environment...');
        const isNative = EnvironmentChecker.isNativeAndroid();
        isNativeRef.current = isNative;
        init.setProgress(5);
        
        init.setLoadingStatus('Initializing Web Environment...');
        init.setProgress(15);

        const aiWarmupPromise = (async () => {
          try {
            const [
              { ReasoningEngine },
              { AiWorkerService: WorkerService },
              { initOmniSynapse: initSynapse },
              { ModelManager },
              { massiveDb },
              { getReactiveDb },
              { SingularityIgnition }
            ] = await Promise.all([
              import('../services/super-assistant/ReasoningEngine'),
              import('../services/aiWorkerService'),
              import('../omni-synapse'),
              import('../HAS/ModelManager'),
              import('../db/massiveDb'),
              import('../db/reactiveDb'),
              import('../HAS/SingularityIgnition')
            ]);
            
            massiveDb.init().catch(e => console.warn('[App] MassiveDb init failed:', e));
            getReactiveDb().catch(e => console.warn('[App] ReactiveDb init failed:', e));

            await Promise.all([
              initSynapse(),
              WorkerService.getWorker(),
              ModelManager.installPrimary(init.setProgress, init.setLoadingStatus)
            ]);
            ReasoningEngine.getInstance();
            
            SingularityIgnition.runAllTests().catch(e => console.warn('[App] Singularity Ignition failed:', e));
            await Promise.all([
              import('../services/advancedAssistant/collaborator/HamEngineCollaborator'),
              import('../services/hamEngine/cortex/core')
            ]);
            (window as any).__HAM_AI_READY__ = true;
          } catch (e) {
            console.warn('[App] AI Engine warmup failed:', e);
          }
        })();

        init.setLoadingStatus('Initializing Singularity Core...');
        try {
          await Promise.race([
            (async () => {
              await initStorage();
              await structuredDb.open();
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Storage Init Timeout')), 8000))
          ]);
        } catch (e) {
          console.error('[App] Storage init critical warning:', e);
        }
        init.setProgress(40);

        init.setLoadingStatus('Mounting Virtual File System...');
        try {
          await Promise.race([
            vfs.initialize(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('VFS Init Timeout')), 10000))
          ]);
        } catch (e) {
          console.error('[App] Critical VFS Mount Error:', e);
          init.setLoadingStatus('VFS Error: System proceeding in Limited Mode...');
        }
        init.setProgress(60);

        init.setLoadingStatus('Synchronizing AI Neural Pathways...');
        try {
          await Promise.race([
            aiWarmupPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('AI Warmup Timeout')), 15000))
          ]);
        } catch (e) {
          console.error('[App] AI Warmup skipped or timed out:', e);
          init.setLoadingStatus('AI Engine Timeout: Proceeding in Limited Mode...');
        }
        init.setProgress(80);

        init.setLoadingStatus('Checking for interrupted tasks...');
        try {
          await Promise.race([
            AutoResumeManager.initialize(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('AutoResumeManager Timeout')), 10_000)
            )
          ]);
        } catch (e) {
          console.warn('[App] AutoResumeManager init skipped:', e);
        }
        init.setProgress(85);

        init.setLoadingStatus('Initializing Background Services...');
        try {
          setBgInit({ vectorStore: 'loading' });
          await VectorStore.getInstance().syncFromVFS();
          setBgInit({ vectorStore: 'success' });
        } catch (e) {
          console.warn('[App] Background VectorStore sync failed:', e);
          setBgInit({ vectorStore: 'error' });
          showToast('Knowledge base sync failed — some AI features may be limited.', 'warning');
        }
        init.setProgress(90);

        try {
          if (!isNative) {
            setBgInit({ webContainer: 'loading' });
            if (!window.crossOriginIsolated) {
              console.warn('[App] Cross-Origin Isolation required for WebContainer');
            } else {
              await Promise.race([
                (async () => {
                  await webcontainerService.boot();
                  await webContainerBootstrapper.boot();
                })(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('WebContainer Boot Timeout')), 30_000)
                )
              ]);
              setBgInit({ webContainer: 'success' });
            }
          } else {
             setBgInit({ webContainer: 'success' });
          }
        } catch (e) {
          console.warn('[App] Background WebContainer boot failed:', e);
          setBgInit({ webContainer: 'error' });
        }
        init.setProgress(95);

        try {
          const { ModelManager } = await import('../HAS/ModelManager');
          await ModelManager.installQueue();
        } catch (e) {
          console.warn('[App] Background Model Queue installation failed:', e);
        }

        init.setLoadingStatus('System Ready.');
        init.setProgress(100);

      } catch (error: any) {
        console.error('[App] Initialization failed:', error);
        if (isMounted) {
          init.setLoadingStatus(`Critical Error: ${error?.message || String(error)}`);
          // [SELF-HEALING] Automatic recovery attempt
          if (init.progress < 50) {
            await healApp();
          }
        }
      } finally {
        if (isMounted) {
          clearInterval(progressWatchdog);
          clearTimeout(forceStartTimer);
          setTimeout(() => {
            init.setLoading(false);
            init.setIsInitialized(true);
            
            // Open App Drawer upon app initialization
            import('../store/appDrawerStore').then(({ useAppDrawerStore }) => {
              useAppDrawerStore.getState().setIsOpen(true);
            });
          }, 300);
        }
      }
    };

    initApp();
    return () => { isMounted = false; };
  }, []);

  return { ...init, ...system, ...tabs, isNativeRef };
}
