/* eslint-disable no-useless-assignment */
import { nativeBridge } from '../../utils/nativeBridge';
import { NativeStorage } from '../../plugins/NativeStorage';
import { vfs as virtualFS } from '../vfs';
import { LoggerService } from '../LoggerService';

export class VFSNativeSync {
  private nativeSyncQueue: Promise<void> = Promise.resolve();

  public enqueue(syncOp: () => Promise<void>, name: string) {
    this.nativeSyncQueue = this.nativeSyncQueue.then(async () => {
      try {
        await Promise.race([
          syncOp(),
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error(`Native Sync Timeout: ${name}`)), 30000)
          )
        ]);
      } catch (err) {
        LoggerService.warn('VFS', `Native Sync Failed [${name}]:`, err);
      }
    }).catch(() => {});
  }

  public async syncFile(path: string, content: string) {
    if (nativeBridge.isAvailable()) {
      const projectId = virtualFS.getCurrentProjectId();
      const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
      await NativeStorage.writeFile({ path: nativePath, data: content });
    }
  }

  public async deleteFile(path: string) {
    if (nativeBridge.isAvailable()) {
      const projectId = virtualFS.getCurrentProjectId();
      const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
      await NativeStorage.deleteFile({ path: nativePath });
    }
  }

  public async rename(oldPath: string, newPath: string) {
    if (nativeBridge.isAvailable()) {
      const projectId = virtualFS.getCurrentProjectId();
      const nativeOldPath = `projects/${projectId}${oldPath.startsWith('/') ? oldPath : '/' + oldPath}`;
      const nativeNewPath = `projects/${projectId}${newPath.startsWith('/') ? newPath : '/' + newPath}`;
      await NativeStorage.rename({ oldPath: nativeOldPath, newPath: nativeNewPath });
    }
  }

  public async mkdir(path: string) {
    if (nativeBridge.isAvailable()) {
      const projectId = virtualFS.getCurrentProjectId();
      const nativePath = `projects/${projectId}${path.startsWith('/') ? path : '/' + path}`;
      await NativeStorage.mkdir({ path: nativePath });
    }
  }
}
