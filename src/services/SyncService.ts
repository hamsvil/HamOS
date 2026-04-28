/* eslint-disable no-useless-assignment */
import { nativeBridge } from '../utils/nativeBridge';
import { EnvironmentChecker } from './environmentChecker';
import { LoggerService } from '../services/LoggerService';

export const SyncService = {
  /**
   * Sync a file or folder to the Android device's internal storage (Documents/privatesource)
   * This only works when running inside the native Android wrapper.
   */
  syncToDevice: async (path: string, data?: string | Uint8Array, isDirectory: boolean = false) => {
    if (!EnvironmentChecker.isNativeAndroid()) return;

    // PROTOKOL: Sync Exclusion (Anti-Explosion)
    // Prevent syncing heavy/system directories that would kill Android performance
    const excludedDirs = ['node_modules', '.git', 'dist', '.next', 'build', '.trash'];
    if (excludedDirs.some(dir => path.includes(dir))) {
      return;
    }

    try {
      // The target folder on Android is Documents/privatesource
      // We pass this to the native bridge which handles the actual Scoped Storage / MediaStore API
      const targetFolder = 'Documents/privatesource';
      
      if (isDirectory) {
        await nativeBridge.callAsync('Android', 'mkdirExternal', {
          path,
          root: targetFolder
        });
      } else {
        // For files, we send the data to be written
        // If data is large, the native bridge handles chunking if implemented in native side
        await nativeBridge.callAsync('Android', 'writeFileExternal', {
          path,
          data,
          root: targetFolder,
          encoding: typeof data === 'string' ? 'utf8' : 'base64'
        });
      }
      
      LoggerService.info('SyncService', `Successfully synced ${path} to ${targetFolder}`);
    } catch (error) {
      LoggerService.error('SyncService', `Failed to sync ${path} to device`, error);
      // We don't throw here to prevent breaking the main app flow if sync fails
    }
  },

  /**
   * Delete a file or folder from the synced location on the device
   */
  removeFromDevice: async (path: string) => {
    if (!EnvironmentChecker.isNativeAndroid()) return;

    try {
      await nativeBridge.callAsync('Android', 'deleteFileExternal', {
        path,
        root: 'Documents/privatesource'
      });
    } catch (error) {
      LoggerService.error('SyncService', `Failed to remove ${path} from device sync`, error);
    }
  },

  /**
   * Rename/Move a file or folder on the synced location
   */
  renameOnDevice: async (oldPath: string, newPath: string) => {
    if (!EnvironmentChecker.isNativeAndroid()) return;

    try {
      await nativeBridge.callAsync('Android', 'renameFileExternal', {
        oldPath,
        newPath,
        root: 'Documents/privatesource'
      });
    } catch (error) {
      LoggerService.error('SyncService', `Failed to rename ${oldPath} on device sync`, error);
    }
  },

  /**
   * Pull files from the Android device's internal storage to the app's Private Source
   */
  pullFromDevice: async (path: string = ''): Promise<{ files: { path: string; data: string; isDirectory: boolean }[] }> => {
    if (!EnvironmentChecker.isNativeAndroid()) return { files: [] };

    try {
      const result = await nativeBridge.callAsync('Android', 'listExternal', {
        path,
        root: 'Documents/privatesource',
        recursive: true,
        includeData: true // We request data for files to perform the sync
      });
      
      return result || { files: [] };
    } catch (error) {
      LoggerService.error('SyncService', `Failed to pull files from device`, error);
      return { files: [] };
    }
  }
};
