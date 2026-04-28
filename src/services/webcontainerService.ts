 
 
import type { FileSystemTree } from '@webcontainer/api';
import { safeStorage } from '../utils/storage';
import { nativeFileService } from './nativeFileService';
import { vfs } from './vfsService';
import { EnvironmentChecker } from './environmentChecker';
import { nativeBridge } from '../utils/nativeBridge';
import { createNativeMockWebContainer, getBridgeScript } from './webcontainerServiceHelpers';
import { webContainerBootstrapper } from './runtime/webContainer';
import { LoggerService } from './LoggerService';

import { useSystemStore } from '../store/systemStore';
import { IWebContainer, IWebContainerProcess } from '../types/webcontainer';

export { webContainerBootstrapper };
export type { IWebContainerProcess };

export class WebContainerService {
  private static instance: WebContainerService;
  private webcontainerInstance: IWebContainer | null = null;
  private isBooting = false;
  private bootPromise: Promise<IWebContainer> | null = null;
  private processes: Set<IWebContainerProcess> = new Set();
  private isInstalling = false;
  private devServerProcess: IWebContainerProcess | null = null;
  private serverReadyCallback: ((port: number, url: string) => void) | null = null;
  
  // Watchdog State
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private crashCount = 0;
  private lastCrashTime = 0;

  private constructor() {
    // Point 15: ServiceWorker Bridge
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data?.type === 'PREVIEW_REQUEST') {
          const { url, method, headers } = event.data.payload;
          const port = event.ports[0];
          
          try {
            // Forward request to WebContainer
            const response = await this.handlePreviewRequest(url, method, headers);
            port.postMessage(response);
          } catch (e) {
            port.postMessage({ body: 'Error forwarding request to WebContainer', status: 500 });
          }
        }
      });
    }
  }

  private async handlePreviewRequest(url: string, method: string, headers: any) {
    const instance = await this.boot();
    // This is a simplified version. In a real scenario, we'd use a more robust
    // way to route requests to the WebContainer's internal network.
    // For now, we'll assume the dev server is running on port 3000.
    const path = new URL(url).pathname;
    try {
        const content = await instance.fs.readFile(path);
        return { body: content, status: 200, headers: { 'Content-Type': 'text/html' } };
    } catch (e) {
        return { body: 'Not Found', status: 404 };
    }
  }

  public static getInstance(): WebContainerService {
    if (!WebContainerService.instance) {
      WebContainerService.instance = new WebContainerService();
    }
    return WebContainerService.instance;
  }

  public isBooted(): boolean {
    return this.webcontainerInstance !== null || EnvironmentChecker.isNativeAndroid();
  }

  public isNativeMock(): boolean {
    return EnvironmentChecker.isNativeAndroid() && this.webcontainerInstance === null;
  }

  public async boot(): Promise<IWebContainer> {
    // Native Mode Bypass
    if (EnvironmentChecker.isNativeAndroid()) {
        return this.getNativeMock();
    }

    if (this.webcontainerInstance) return this.webcontainerInstance;
    
    if (this.bootPromise) return this.bootPromise;

    this.bootPromise = (async () => {
      try {
        // Use the Supreme Ascension Bootstrapper
        this.webcontainerInstance = await webContainerBootstrapper.boot();
        this.startWatchdog();
        return this.webcontainerInstance;
      } catch (error) {
        // Fallback to Native Mock ONLY if in native environment
        if (EnvironmentChecker.isNativeAndroid()) {
            LoggerService.warn('WebContainer', 'WebContainer boot failed in native environment, falling back to NativeMock');
            return this.getNativeMock();
        }
        
        LoggerService.error('WebContainer', 'WebContainer boot failed in web environment', error);
        
        // Instead of throwing a fatal error that crashes the whole terminal init,
        // we throw a specific error that shellService can catch and handle.
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`WEBCONTAINER_BOOT_FAILED: ${msg}`, { cause: error });
      }
    })();

    return this.bootPromise;
  }

  private getNativeMock(): IWebContainer {
      return createNativeMockWebContainer(this);
  }

  public async cacheDependencies(projectId: string) {
    try {
      // In a real scenario, we'd zip node_modules and store in IndexedDB.
    } catch (e) {
      LoggerService.error('WebContainer', 'Failed to cache dependencies', e);
    }
  }

  public async restoreDependencies(projectId: string): Promise<boolean> {
    try {
      const instance = await this.boot();
      try {
        await instance.fs.readdir('node_modules');
        return true;
      } catch (e) {
        LoggerService.warn('WebContainer', 'Restore dependencies failed (readdir node_modules)', e);
        return false;
      }
    } catch (e) {
      LoggerService.warn('WebContainer', 'Restore dependencies failed (boot)', e);
      return false;
    }
  }

  public async mount(files: FileSystemTree) {
    const instance = await this.boot();
    await instance.mount(files).catch(err => LoggerService.error('WebContainer', 'Mount failed', err));
  }

  public async spawnShell(options?: Record<string, unknown>): Promise<IWebContainerProcess> {
    const instance = await this.boot();
    const process = await instance.spawn('jsh', { terminal: { cols: 80, rows: 24 }, ...options });
    this.processes.add(process);
    process.exit
      .then(() => this.processes.delete(process))
      .catch((e) => {
        LoggerService.warn('WebContainer', 'Shell exit error', e);
        this.processes.delete(process);
      });
    return process;
  }

  public async spawn(command: string, args: string[] = [], options?: Record<string, unknown>): Promise<IWebContainerProcess> {
    const instance = await this.boot();
    
    // Track dev server process for restarting
    const isDevServer = command === 'npm' && args.includes('run') && (args.includes('dev') || args.includes('start'));
    
    if (isDevServer && this.devServerProcess) {
        try { this.devServerProcess.kill(); } catch (e) {
            LoggerService.warn('WebContainer', 'Failed to kill existing dev server process', e);
        }
        this.devServerProcess = null;
    }

    const process = await instance.spawn(command, { args, ...options });
    
    if (isDevServer) {
        this.devServerProcess = process;
    }

    this.processes.add(process);
    process.exit
      .then(() => {
          this.processes.delete(process);
          if (this.devServerProcess === process) this.devServerProcess = null;
      })
      .catch((e) => {
          LoggerService.warn('WebContainer', 'Process exit error', e);
          this.processes.delete(process);
          if (this.devServerProcess === process) this.devServerProcess = null;
      });
    return process;
  }

  public async restartServer() {
    if (this.devServerProcess) {
        // console.log('[WebContainer] Restarting dev server...');
        // We assume 'npm run dev' is the standard for now.
        // In a more advanced version, we'd store the original args.
        this.devServerProcess.kill();
        this.devServerProcess = null;
        
        // Zombie-Sweeper: Ensure no orphaned node processes
        await this.zombieSweeper();
        
        await this.spawn('npm', ['run', 'dev']);
    }
  }

  public async zombieSweeper() {
    if (this.isNativeMock()) return;
    try {
        LoggerService.info('WebContainer', 'Running Zombie-Sweeper...');
        const pkill = await this.spawn('pkill', ['-9', 'node']);
        await pkill.exit;
    } catch (e) {
        // pkill might fail if no processes found, which is fine
        LoggerService.info('WebContainer', 'Zombie-Sweeper finished (no processes or error)', e);
    }
  }

  public killAllProcesses() {
    this.processes.forEach(p => {
      try { p.kill(); } catch (e) {
          LoggerService.warn('WebContainer', 'Failed to kill process during killAllProcesses', e);
      }
    });
    this.processes.clear();
  }

  private async preprocessPackageJson() {
    try {
      const content = await vfs.readFile('/package.json');
      const pkg = JSON.parse(content);
      let changed = false;

      // Point 12: Native NPM Package Redirection (Aliasing)
      const aliases: Record<string, string> = {
        'sqlite3': 'sql.js',
        'sharp': '@squoosh/lib',
        'canvas': 'canvas-wasm' // hypothetical
      };

      if (pkg.dependencies) {
        for (const [native, wasm] of Object.entries(aliases)) {
          if (pkg.dependencies[native]) {
            // console.log(`[WebContainer] Aliasing native package ${native} to ${wasm}`);
            delete pkg.dependencies[native];
            pkg.dependencies[wasm] = 'latest';
            changed = true;
          }
        }
      }

      if (changed) {
        await vfs.writeFile('/package.json', JSON.stringify(pkg, null, 2));
      }
    } catch (e) {
      LoggerService.warn('WebContainer', 'Failed to preprocess package.json', e);
    }
  }

  public async triggerBackgroundInstall() {
    if (this.isInstalling || this.isNativeMock()) return;
    this.isInstalling = true;
    useSystemStore.getState().setInstalling(true);
    try {
        await this.preprocessPackageJson();
        const process = await this.spawn('npm', ['install']);
        const exitCode = await process.exit.catch(e => {
            LoggerService.error('WebContainer', 'npm install exit error', e);
            return -1;
        });
        if (exitCode !== 0) {
            LoggerService.error('WebContainer', `npm install failed with exit code ${exitCode}`);
        }
    } catch (e) {
        console.warn('Background install failed', e);
    } finally {
        this.isInstalling = false;
        useSystemStore.getState().setInstalling(false);
    }
  }

  public async writeFile(path: string, content: string) {
    const instance = await this.boot();
    
    // Auto-inject bridge script for preview communication
    if (path.endsWith('index.html')) {
      const bridgeScript = getBridgeScript();
      
      if (content.match(/<\/body>/i)) {
        content = content.replace(/<\/body>/i, `${bridgeScript}</body>`);
      } else {
        content += bridgeScript;
      }
    }
    
    await instance.fs.writeFile(path, content).catch(err => LoggerService.error('WebContainer', `Write failed: ${path}`, err));
  }

  public async readFile(path: string): Promise<string> {
    const instance = await this.boot();
    return await instance.fs.readFile(path).catch(err => {
      LoggerService.error('WebContainer', `Read failed: ${path}`, err);
      throw err;
    });
  }

  public async mkdir(path: string) {
    const instance = await this.boot();
    await instance.fs.mkdir(path, { recursive: true }).catch(err => {
      LoggerService.error('WebContainer', `mkdir failed: ${path}`, err);
      throw err;
    });
  }

  public async readdir(path: string): Promise<string[]> {
    const instance = await this.boot();
    return await instance.fs.readdir(path).catch(err => {
      LoggerService.error('WebContainer', `readdir failed: ${path}`, err);
      throw err;
    });
  }

  public async rm(path: string, options?: { recursive?: boolean, force?: boolean }) {
    const instance = await this.boot();
    await instance.fs.rm(path, options).catch(err => LoggerService.error('WebContainer', `rm failed: ${path}`, err));
  }

  public async onServerReady(callback: (port: number, url: string) => void) {
    const instance = await this.boot();
    instance.on('server-ready', (port, url) => {
      // console.log(`[WebContainer] Server ready at ${url} (Port: ${port})`);
      window.dispatchEvent(new CustomEvent('ham-server-ready', { detail: { port, url } }));
      callback(port, url);
    });
  }

  private startWatchdog() {
    if (this.watchdogTimer || this.isNativeMock()) return;
    this.watchdogTimer = setInterval(async () => {
        if (!this.webcontainerInstance) return;
        try {
            await this.webcontainerInstance.fs.readdir('/');
        } catch (e) {
            LoggerService.error('Watchdog', 'WebContainer unresponsive, initiating recovery', e);
            this.handleCrash();
        }
    }, 15000);
  }

  private async handleCrash() {
    const now = Date.now();
    if (now - this.lastCrashTime > 120000) {
        this.crashCount = 0;
    }
    
    this.crashCount++;
    this.lastCrashTime = now;

    if (this.crashCount >= 3) {
        LoggerService.error('Watchdog', 'WebContainer death spiral detected. Entering Safe Mode.');
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ham-safe-mode', { detail: { reason: 'WebContainer OOM/Crash loop' } }));
        }
        this.stopWatchdog();
        return;
    }

    LoggerService.warn('Watchdog', `Rebooting WebContainer (Attempt ${this.crashCount}/3)`);
    await this.teardown();
    await this.boot();
  }

  private stopWatchdog() {
      if (this.watchdogTimer) {
          clearInterval(this.watchdogTimer);
          this.watchdogTimer = null;
      }
  }

  public async teardown() {
    this.stopWatchdog();
    this.killAllProcesses();
    if (this.webcontainerInstance) {
      try {
        await this.webcontainerInstance.teardown();
        this.webcontainerInstance = null;
        this.bootPromise = null;
        this.isBooting = false;
      } catch (e) {
        LoggerService.error('WebContainer', 'Failed to teardown WebContainer', e);
      }
    }
  }

  public async resetEnvironment(): Promise<void> {
    LoggerService.info('WebContainer', 'Initiating Ephemeral Cloud Container Reset...');
    const startTime = performance.now();
    
    // 1. Teardown existing instance
    await this.teardown();
    
    // 2. Clear OPFS root (Zero-Latency Environment Sync prep)
    try {
        const root = await navigator.storage.getDirectory();
        // We can't easily delete the root itself, but we can clear its contents
        // For now, we rely on VFS to clear its state if needed, or we just boot fresh
        // In a full OPFS implementation, we'd iterate and delete entries
        for await (const [name, handle] of (root as any).entries()) {
            await root.removeEntry(name, { recursive: true }).catch(() => {});
        }
    } catch (e) {
        LoggerService.warn('WebContainer', 'Failed to clear OPFS root during reset', e);
    }

    // 3. Reboot instance
    await this.boot();
    
    const duration = performance.now() - startTime;
    LoggerService.info('WebContainer', `Environment reset completed in ${duration.toFixed(2)}ms`);
  }

  public async exposePublicUrl(port: number = 3000): Promise<string> {
      LoggerService.info('WebContainer', `Exposing port ${port} via Pinggy.io...`);
      const instance = await this.boot();
      
      return new Promise((resolve, reject) => {
          // Using Pinggy.io via ssh (requires ssh client in WebContainer, which might not exist)
          // Alternative: npx localtunnel
          instance.spawn('npx', { args: ['localtunnel', '--port', port.toString()] }).then(process => {
              process.output.pipeTo(new WritableStream({
                  write(data) {
                      const match = data.match(/your url is: (https:\/\/[^\s]+)/);
                      if (match && match[1]) {
                          LoggerService.info('WebContainer', `Public URL established: ${match[1]}`);
                          resolve(match[1]);
                      }
                  }
              }));
              
              // Timeout fallback
              setTimeout(() => reject(new Error("Timeout waiting for public URL")), 15000);
          }).catch(reject);
      });
  }

  public getPreviewUrl(): string {
    // Phase 1: Phantom Bundler Priority (Virtual Domain)
    return 'https://preview.local';
  }

  /**
   * Phase 4: Ham Engine Bridge Logic
   * Determines if the project can be rendered using Phantom Bundler (Local)
   * or requires a full Node.js environment (WebContainer/Cloud).
   */
  public async shouldUsePhantom(): Promise<boolean> {
    try {
      const packageJsonContent = await vfs.readFile('/package.json');
      const pkg = JSON.parse(packageJsonContent);
      
      const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
      
      // List of known native/complex libraries that Phantom can't handle yet
      const nativeLibs = [
        'sqlite3', 'canvas', 'sharp', 'bcrypt', 'node-sass', 
        'puppeteer', 'playwright', 'next', 'nuxt', 'svelte-kit'
      ];

      for (const lib of nativeLibs) {
        if (dependencies[lib]) {
          // console.log(`[OmniBridge] Native dependency detected: ${lib}. Using WebContainer.`);
          return false;
        }
      }

      return true;
    } catch (e) {
      // If no package.json, default to Phantom for simple static/React files
      return true;
    }
  }
}

export const webcontainerService = WebContainerService.getInstance();
