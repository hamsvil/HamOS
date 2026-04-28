/* eslint-disable no-useless-assignment */
import { NativeStorage } from '../plugins/NativeStorage';
import { EnvironmentChecker } from './environmentChecker';
import { ProjectData, ChatMessageData } from '../components/HamAiStudio/types';
import { safeStorage } from '../utils/storage';
import { structuredDb, ProjectRecord } from '../db/structuredDb';

// ANTI-SIMULATION: Native File System Access (Storage Access Framework)
const syncToNativeStorage = async (project: ProjectRecord) => {
  try {
    // Check if NativeStorage is available before calling
    if (typeof NativeStorage === 'undefined' || !NativeStorage.bulkWrite) {
        return true; // Pretend success to clear queue if plugin is missing (e.g. in browser dev)
    }

    // Use nativeBridge to check availability
    const { nativeBridge } = await import('../utils/nativeBridge');
    if (!nativeBridge.isAvailable()) {
        return true; // Not native environment
    }

    // Get internal data directory for consistent path
    const { path: dataDir } = await NativeStorage.getInternalDataDirectory();
    if (!dataDir) {
        return false;
    }

    const safeProjectName = project.name || 'default';
    const projectDir = `${dataDir}/projects/${safeProjectName}`;
    
    // Ensure base directory exists (ignore errors if they already exist)
    // NativeStorage.mkdir handles recursive creation if implemented, but let's be safe
    // We rely on bulkWrite to handle directory creation if possible, or fallback
    
    // Prepare files for bulk write
    const filesToSync = project.data.files.map(file => {
      // Remove leading slash to prevent absolute path issues relative to project root
      const relativePath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
      return {
        path: `${projectDir}/${relativePath}`,
        data: file.content
      };
    });

    // Bulk write
    const result = await NativeStorage.bulkWrite({ files: filesToSync });
    
    if (result.success) {
      return true;
    } else {
      return false;
    }

  } catch (error) {
    return false; // Retry later
  }
};

let syncQueue: ProjectRecord[] = [];
try {
  const savedQueue = safeStorage.getItem('ham_sync_queue');
  if (savedQueue) {
    syncQueue = JSON.parse(savedQueue);
  }
} catch (e) {}

const saveSyncQueue = () => {
  try {
    safeStorage.setItem('ham_sync_queue', JSON.stringify(syncQueue));
  } catch (e) {}
};

let isSyncing = false;

const processSyncQueue = async () => {
  if (isSyncing || syncQueue.length === 0) return;
  isSyncing = true;
  
  while (syncQueue.length > 0) {
    const project = syncQueue[0]; // Peek at the first item
    if (project) {
      const success = await syncToNativeStorage(project);
      if (success) {
        syncQueue.shift(); // Remove on success
        saveSyncQueue();
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ham-vfs-error', { detail: { message: 'Gagal sinkronisasi proyek ke server. Akan dicoba lagi nanti.' } }));
        }
        break; // Stop syncing on error, keep in queue
      }
    } else {
      syncQueue.shift();
    }
  }
  isSyncing = false;
};

// Start processing queue on load
setTimeout(processSyncQueue, 5000);

export const projectService = {
  async getProjects(): Promise<ProjectRecord[]> {
    const projects = await structuredDb.projects.toArray();
    return projects.sort((a, b) => b.timestamp - a.timestamp);
  },

  async getProject(id: string): Promise<ProjectRecord | undefined> {
    return await structuredDb.projects.get(id);
  },

  async saveProject(project: ProjectRecord): Promise<void> {
    if (!project.id) {
      console.error('[ProjectService] Attempted to save project without ID:', project);
      throw new Error('Project ID is required for saving');
    }
    await structuredDb.projects.put(project);
    
    // Auto-snapshot on save
    await this.createSnapshot(project.id, project.data);
    
    // Sync to native file system via queue
    syncQueue.push(project);
    saveSyncQueue();
    processSyncQueue();
  },

  async createSnapshot(projectId: string, data: ProjectData): Promise<void> {
    const snapshots = await structuredDb.projectSnapshots.where('projectId').equals(projectId).toArray();
    // Limit to 20 snapshots per project
    if (snapshots.length >= 20) {
      const oldest = snapshots.sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest.id) {
        await structuredDb.projectSnapshots.delete(oldest.id);
      }
    }
    await structuredDb.projectSnapshots.add({ projectId, data, timestamp: Date.now() });
  },

  async getSnapshots(projectId: string): Promise<unknown[]> {
    const snapshots = await structuredDb.projectSnapshots.where('projectId').equals(projectId).toArray();
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  },

  async deleteProject(id: string): Promise<void> {
    const project = await structuredDb.projects.get(id);
    
    await structuredDb.projects.delete(id);
    // Delete snapshots too
    const snapshots = await structuredDb.projectSnapshots.where('projectId').equals(id).toArray();
    for (const s of snapshots) {
      if (s.id) {
        await structuredDb.projectSnapshots.delete(s.id);
      }
    }
    // Remove from sync queue
    syncQueue = syncQueue.filter(p => p.id !== id);
    saveSyncQueue();

    // Delete from server (only if not native)
    if (!EnvironmentChecker.isNativeAndroid()) {
        try {
            await fetch(`/ham-api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
        } catch (e: any) {
            const err = e as Error;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ham-vfs-error', { detail: { message: `Gagal menghapus proyek dari server: ${err.message}` } }));
            }
        }
    }

    // Delete from native storage
    if (project) {
        try {
            const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const projectDir = `HamStudio/Projects/${safeProjectName}`;
            if (typeof NativeStorage !== 'undefined') {
                if (NativeStorage.readdir && NativeStorage.deleteFile) {
                    const deleteRecursive = async (dirPath: string) => {
                        try {
                            const { files } = await NativeStorage.readdir({ path: dirPath });
                            for (const file of files) {
                                const fullPath = `${dirPath}/${file}`;
                                let isDir = false;
                                try {
                                    await NativeStorage.readdir({ path: fullPath });
                                    isDir = true;
                                } catch (e) {
                                    isDir = false;
                                }
                                
                                if (isDir) {
                                    await deleteRecursive(fullPath);
                                } else {
                                    await NativeStorage.deleteFile({ path: fullPath });
                                }
                            }
                            if (NativeStorage.rmdir) {
                                await NativeStorage.rmdir({ path: dirPath });
                            }
                        } catch (e) {
                            // Could not delete directory
                        }
                    };
                    await deleteRecursive(projectDir);
                }
            }
            
            try {
                const { del } = await import('idb-keyval');
                await del(`ham_vfs_${id}`);
            } catch (e) {
                // Could not delete VFS IndexedDB key
            }
        } catch (e: any) {
            const err = e as Error;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ham-vfs-error', { detail: { message: `Gagal menghapus proyek dari penyimpanan lokal: ${err.message}` } }));
            }
        }
    }
  },

  async clearAllProjects(): Promise<void> {
    await structuredDb.projects.clear();
    await structuredDb.projectSnapshots.clear();
    
    // Clear from server (only if not native)
    if (!EnvironmentChecker.isNativeAndroid()) {
        try {
            await fetch('/ham-api/projects', { method: 'DELETE' });
        } catch (e: any) {
            const err = e as Error;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ham-vfs-error', { detail: { message: `Gagal membersihkan proyek dari server: ${err.message}` } }));
            }
        }
    }
  }
};
