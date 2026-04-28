/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { vfs as virtualFS } from './vfs';
import { NativeStorage } from '../plugins/NativeStorage';
import { nativeBridge } from '../utils/nativeBridge';
import { LoggerService } from './LoggerService';
import { safeStorage } from '../utils/storage';

export const vfsExtraService = {
  async getProjectSnapshot(options: { full?: boolean, skipBinary?: boolean } = {}): Promise<{ id: string, name: string, files: { path: string, content: string, isBinary?: boolean }[] }> {
    const fs = virtualFS.getFS();
    const files: { path: string, content: string, isBinary?: boolean }[] = [];
    let fileCount = 0;
    
    const isBinaryFile = (path: string) => !!path.match(/\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot|mp4|webm|wav|mp3|zip|tar|gz|wasm|jar|pdf|apk|exe|dll|so|class|bin|dat|db|sqlite|mkv|avi|mov|flv|wmv|m4a|flac|ogg|aac|wma|7z|rar|iso|dmg|pkg|deb|rpm|msi|cab|psd|ai|eps|indd|raw|heic|webp|tiff|bmp|obj|fbx|blend|stl|gltf|glb|doc|docx|xls|xlsx|ppt|pptx|epub|mobi)$/i);

    const listRecursive = async (dir: string) => {
      const list = (fs as { readdirSync: (p: string) => string[] }).readdirSync(dir);
      for (const file of list) {
        const path = `${dir === '/' ? '' : dir}/${file}`;
        const stat = (fs as { statSync: (p: string) => { isDirectory: () => boolean, size: number } }).statSync(path);
        
        fileCount++;
        if (fileCount % 100 === 0) {
          // Yield control to the event loop more frequently (every 100 files)
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (stat && stat.isDirectory()) {
          if (file !== '.git' && file !== 'node_modules' && file !== '.shadow_vfs' && 
              file !== 'dist' && file !== '.next' && file !== '.cache' && 
              file !== 'build' && file !== 'out' && file !== 'target') {
            await listRecursive(path);
          }
        } else {
          const isBinary = isBinaryFile(path);
          
          if (isBinary && options.skipBinary) {
              continue;
          }
          
          if (isBinary && !options.full) {
              files.push({ path, content: `[Binary file omitted]`, isBinary: true });
              continue;
          }

          try {
              if (stat && stat.size > 250000 && !options.full) { // Increased limit to 250KB for non-full snapshots
                  files.push({ path, content: `[File too large: ${Math.round(stat.size/1024)}KB. Omitted]` });
              } else {
                  if (isBinary) {
                      const buffer = (fs as unknown as { readFileSync: (p: string) => Uint8Array }).readFileSync(path);
                      let binary = '';
                      const len = buffer.byteLength;
                      const chunk = 8192;
                      for (let i = 0; i < len; i += chunk) {
                          binary += String.fromCharCode.apply(null, buffer.subarray(i, i + chunk) as unknown);
                      }
                      files.push({ path, content: btoa(binary), isBinary: true });
                  } else {
                      const buffer = (fs as unknown as { readFileSync: (p: string) => Uint8Array }).readFileSync(path);
                      const decoder = new TextDecoder('utf-8');
                      const content = decoder.decode(buffer);
                      files.push({ path, content });
                  }
              }
          } catch (e) {
              LoggerService.warn('VFS', `Snapshot read error for ${path}`, e);
          }
        }
      }
    };
    
    await listRecursive('/');
    
    return {
      id: `proj_${Date.now()}`,
      name: 'VFS Project',
      files
    };
  },

  async createSnapshot(name: string = 'auto-save'): Promise<string> {
    const snapshot = await this.getProjectSnapshot({ full: true });
    const snapshotId = `vfs_snap_${Date.now()}`;
    const data = JSON.stringify({ ...snapshot, name, timestamp: Date.now() });
    
    if (nativeBridge.isAvailable()) {
      await NativeStorage.writeFile({ path: `snapshots/${snapshotId}.json`, data });
    } else {
      safeStorage.setItem(snapshotId, data);
      const snapshotsRaw = safeStorage.getItem('vfs_snapshots');
      const snapshots = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];
      snapshots.push(snapshotId);
      safeStorage.setItem('vfs_snapshots', JSON.stringify(snapshots));
    }
    
    // console.log(`[VFS] Snapshot created: ${snapshotId} (${name})`);
    return snapshotId;
  },

  async restoreSnapshot(snapshotId: string, bulkWriteFn: (files: any[]) => Promise<void>): Promise<void> {
    let data: string | null = null;
    if (nativeBridge.isAvailable()) {
      const result = await NativeStorage.readFile({ path: `snapshots/${snapshotId}.json` });
      data = result.data as string;
    } else {
      data = safeStorage.getItem(snapshotId);
    }

    if (!data) throw new Error(`Snapshot ${snapshotId} not found.`);

    const snapshot = JSON.parse(data);
    await bulkWriteFn(snapshot.files);
    // console.log(`[VFS] Snapshot restored: ${snapshotId}`);
  },

  async initGit(path: string) {
    const fs = virtualFS.getFS();
    if (!(fs as { existsSync: (p: string) => boolean }).existsSync(`${path}/.git`)) {
      // Ready for status
    }
  },

  async gitStatus(path: string): Promise<unknown[]> {
    return await virtualFS.gitStatus(path);
  },

  async gitCommit(path: string, message: string, author: { name: string, email: string }): Promise<void> {
    await virtualFS.gitCommit(path, message, author);
  },

  async gitGetHeadContent(repoPath: string, filePath: string): Promise<string> {
    return await virtualFS.gitReadObject(repoPath, filePath);
  },

  async gitPush(path: string, remoteUrl: string, token: string): Promise<void> {
    await virtualFS.gitPush(path, remoteUrl, token);
  },

  async gitPull(path: string, remoteUrl: string, token: string): Promise<void> {
    await virtualFS.gitPull(path, remoteUrl, token);
  }
};
