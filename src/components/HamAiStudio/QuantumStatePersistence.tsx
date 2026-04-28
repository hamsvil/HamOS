 
import React, { useEffect, useRef } from 'react';
import { isEqual } from 'es-toolkit';
import { useProjectStore } from '../../store/projectStore';
import { safeStorage } from '../../utils/storage';
import { LoggerService } from '../../services/LoggerService';

// Simple hash function for quick comparison
const generateHash = (obj: any): string => {
  try {
    // For large objects, a full stringify might be slow, but it's reliable for hashing
    // In a real high-perf app, we might use a specialized object hasher
    return JSON.stringify(obj);
  } catch (e) {
    return String(Date.now());
  }
};

export const QuantumStatePersistence: React.FC = () => {
  const project = useProjectStore(state => state.project);
  const shadowBuffers = useProjectStore(state => state.shadowBuffers);
  const saveImmediately = useProjectStore(state => state.saveImmediately);
  
  const lastSavedHash = useRef<string>('');
  const syncChannel = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for cross-tab sync
  useEffect(() => {
    syncChannel.current = new BroadcastChannel('ham_quantum_sync');
    
    syncChannel.current.onmessage = (event) => {
      if (!project || event.data.projectId !== project.id) return;

      if (event.data.type === 'SHADOW_BUFFERS_UPDATE') {
        const newBuffers = event.data.payload;
        const currentBuffers = useProjectStore.getState().shadowBuffers;
        
        if (!isEqual(newBuffers, currentBuffers)) {
          Object.entries(newBuffers).forEach(([path, content]) => {
            useProjectStore.getState().setShadowBuffer(path, content as string);
          });
          LoggerService.info('QuantumPersistence', 'State synchronized from another tab.');
        }
      }
    };

    return () => {
      syncChannel.current?.close();
    };
  }, [project]);

  // Periodic and change-based saving
  useEffect(() => {
    if (!project) return;

    const performSave = async () => {
      try {
        const currentBuffers = useProjectStore.getState().shadowBuffers;
        const currentHash = generateHash(currentBuffers);
        
        // Only save if content actually changed
        if (currentHash === lastSavedHash.current) return;

        // Save to project history
        await saveImmediately();
        
        // Save shadow buffers to safeStorage
        safeStorage.setItem(`ham_quantum_shadow_buffers_${project.id}`, JSON.stringify(currentBuffers));
        
        // Save current UI state
        const uiState = useProjectStore.getState().uiState;
        safeStorage.setItem(`ham_quantum_ui_state_${project.id}`, JSON.stringify({
          activeView: useProjectStore.getState().activeView,
          selectedFile: uiState.selectedFile?.path || null,
          projectType: uiState.projectType
        }));

        // Notify other tabs
        syncChannel.current?.postMessage({
          type: 'SHADOW_BUFFERS_UPDATE',
          projectId: project.id,
          payload: currentBuffers
        });

        lastSavedHash.current = currentHash;
        LoggerService.info('QuantumPersistence', 'State synchronized successfully.');
      } catch (e) {
        LoggerService.error('QuantumPersistence', 'Failed to synchronize state', e);
      }
    };

    // Initial save
    performSave();

    // Set up interval for background sync
    const saveInterval = setInterval(performSave, 30000);

    return () => clearInterval(saveInterval);
  }, [project, shadowBuffers, saveImmediately]);

  return null; // Background component
};
