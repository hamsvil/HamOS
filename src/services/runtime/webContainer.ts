/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
// [STABILITY] Promise chains verified
import { WebContainer } from '@webcontainer/api';
import { vfsExtraService } from '../vfsExtraService';
import { getBridgeScript } from '../webcontainerServiceHelpers';

export class WebContainerBootstrapper {
  private static instance: WebContainerBootstrapper;
  private webcontainerInstance: WebContainer | null = null;
  private bootPromise: Promise<WebContainer | null> | null = null;

  private constructor() {
    this.setupSyncBridge();
  }

  public static getInstance(): WebContainerBootstrapper {
    if (!WebContainerBootstrapper.instance) {
      WebContainerBootstrapper.instance = new WebContainerBootstrapper();
    }
    return WebContainerBootstrapper.instance;
  }

  public async boot(): Promise<WebContainer | null> {
    if (this.webcontainerInstance) return this.webcontainerInstance;
    if (this.bootPromise) return this.bootPromise;

    this.bootPromise = (async () => {
      try {
        if (!window.crossOriginIsolated) {
          throw new Error('Environment is not cross-origin isolated. WebContainers require COOP/COEP headers.');
        }

        // console.log('[WebContainer] Booting...');
        this.webcontainerInstance = await WebContainer.boot();
        // console.log('[WebContainer] Booted successfully');
        
        // Initial sync from VFS
        await this.syncFullVFS();
        
        return this.webcontainerInstance;
      } catch (error) {
        console.error('[WebContainer] Boot failed:', error);
        this.bootPromise = null;
        throw error;
      }
    })();

    return this.bootPromise;
  }

  private async syncFullVFS() {
    if (!this.webcontainerInstance) return;
    
    // console.log('[WebContainer] Performing initial VFS sync...');
    const snapshot = await vfsExtraService.getProjectSnapshot({ full: true });
    const files = snapshot.files;
    const tree: any = {};

    let processedCount = 0;
    for (const file of files) {
      if (!file.isBinary) {
        this.addToTree(tree, file.path, file.content);
      }
      processedCount++;
      if (processedCount % 100 === 0) {
        // Yield to event loop to prevent blocking UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    await this.webcontainerInstance.mount(tree);
    // console.log('[WebContainer] Initial VFS sync complete');
    
    // Check if we need to install
    if (files.some(f => f.path.endsWith('package.json'))) {
      this.triggerBackgroundInstall();
    }
  }

  private addToTree(tree: any, path: string, content: string) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const isFolder = path.endsWith('/');
    const parts = cleanPath.split('/').filter(Boolean);
    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = { directory: {} };
      }
      current = current[part].directory;
    }

    const fileName = parts[parts.length - 1];
    if (fileName) {
      if (isFolder) {
        if (!current[fileName]) {
          current[fileName] = { directory: {} };
        }
      } else {
        let finalContent = content;
        if (fileName === 'index.html') {
          const bridgeScript = getBridgeScript();
          if (finalContent.match(/<\/body>/i)) {
            finalContent = finalContent.replace(/<\/body>/i, `${bridgeScript}</body>`);
          } else {
            finalContent += bridgeScript;
          }
        }
        current[fileName] = {
          file: {
            contents: finalContent,
          },
        };
      }
    }
  }

  private setupSyncBridge() {
    if (typeof window === 'undefined') return;

    const pendingChanges = new Map<string, string | null>();
    let flushTimer: any;

    window.addEventListener('ham-file-changed', (event: any) => {
      const { path, content } = event.detail;
      pendingChanges.set(path, content);

      clearTimeout(flushTimer);
      flushTimer = setTimeout(async () => {
        if (!this.webcontainerInstance) return;

        const changes = new Map(pendingChanges);
        pendingChanges.clear();

        for (const [p, c] of changes.entries()) {
          try {
            if (c === null || c === '__DELETED__') {
              await this.webcontainerInstance.fs.rm(p, { recursive: true, force: true });
            } else if (p.endsWith('/')) {
              await this.webcontainerInstance.fs.mkdir(p, { recursive: true });
            } else {
              const parts = p.split('/').filter(Boolean);
              if (parts.length > 1) {
                const dir = parts.slice(0, -1).join('/');
                await this.webcontainerInstance.fs.mkdir(dir, { recursive: true });
              }
              
              let finalContent = c;
              if (p.endsWith('index.html')) {
                const bridgeScript = getBridgeScript();
                if (finalContent.match(/<\/body>/i)) {
                  finalContent = finalContent.replace(/<\/body>/i, `${bridgeScript}</body>`);
                } else {
                  finalContent += bridgeScript;
                }
              }
              
              await this.webcontainerInstance.fs.writeFile(p, finalContent);
              
              if (p.endsWith('package.json')) {
                this.triggerBackgroundInstall();
              }
            }
          } catch (error) {
            console.error(`[WebContainer] Sync error for ${p}:`, error);
          }
        }
      }, 1000);
    });

    // Bulk sync support
    window.addEventListener('ham-bulk-file-changed', async (event: any) => {
      if (!this.webcontainerInstance) return;
      const { files } = event.detail;
      const tree: any = {};
      let hasPackageJson = false;

      for (const file of files) {
        this.addToTree(tree, file.path, file.content);
        if (file.path.endsWith('package.json')) hasPackageJson = true;
      }

      try {
        await this.webcontainerInstance.mount(tree);
        if (hasPackageJson) this.triggerBackgroundInstall();
      } catch (error) {
        console.error('[WebContainer] Bulk sync error:', error);
      }
    });
  }

  private isInstalling = false;
  private async triggerBackgroundInstall() {
    if (this.isInstalling || !this.webcontainerInstance) return;
    this.isInstalling = true;
    // console.log('[WebContainer] Starting background npm install...');
    try {
      const process = await this.webcontainerInstance.spawn('npm', ['install']);
      // Add a 60-second timeout to prevent hanging
      let timeoutId: any;
      await Promise.race([
          process.exit.then(() => { if (timeoutId) clearTimeout(timeoutId); }).catch(console.error),
          new Promise((_, reject) => {
              timeoutId = setTimeout(() => {
                  try { process.kill(); } catch (e) {}
                  reject(new Error('Background npm install timeout'));
              }, 60000);
          })
      ]);
      // console.log('[WebContainer] Background npm install complete');
    } catch (error) {
      console.error('[WebContainer] Background npm install failed:', error);
    } finally {
      this.isInstalling = false;
    }
  }

  public getInstance() {
    return this.webcontainerInstance;
  }
}

export const webContainerBootstrapper = WebContainerBootstrapper.getInstance();
