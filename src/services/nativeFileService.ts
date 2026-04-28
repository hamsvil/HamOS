/* eslint-disable no-useless-catch */
/* eslint-disable no-useless-assignment */
import { vfs } from './vfsService';
import { nativeBridge } from '../utils/nativeBridge';
import { EnvironmentChecker } from './environmentChecker';

interface WindowWithShell extends Window {
  shellHandlers?: Record<string, (type: string, content: string) => void>;
  onShellOutput?: (id: string, type: string, content: string) => void;
}

export class NativeFileService {
  private static instance: NativeFileService;

  private constructor() {}

  public static getInstance(): NativeFileService {
    if (!NativeFileService.instance) {
      NativeFileService.instance = new NativeFileService();
    }
    return NativeFileService.instance;
  }

  isNativeAvailable(): boolean {
    return EnvironmentChecker.isNativeAndroid();
  }

  async saveFileToDocuments(filename: string, content: string): Promise<boolean> {
    try {
      if (this.isNativeAvailable()) {
        // Use the native bridge
        const result = nativeBridge.call<boolean>('saveFileToDocuments', filename, content);
        return result === true;
      } else {
        // Fallback to VFS for web/dev environment
        await vfs.writeFile(filename, content);
        return true;
      }
    } catch (e) {
      // Native save failed
      return false;
    }
  }

  async executeShellCommand(
    command: string, 
    onOutput?: (type: string, content: string) => void, 
    timeoutMs: number = 30000,
    cwd?: string,
    env?: Record<string, string>
  ): Promise<string> {
    if (this.isNativeAvailable()) {
      return new Promise((resolve, reject) => {
        const callbackId = 'shell_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        let output = '';
        let isDone = false;
        
        const cleanup = () => {
            isDone = true;
            const win = window as unknown as WindowWithShell;
            if (win.shellHandlers) {
                delete win.shellHandlers[callbackId];
            }
        };

        const timeout = setTimeout(() => {
            if (!isDone) {
                cleanup();
                reject(new Error(`Shell command timed out after ${timeoutMs}ms`));
            }
        }, timeoutMs);
        
        // Setup global callback handler if not exists
        const win = window as unknown as WindowWithShell;
        if (!win.onShellOutput) {
            win.onShellOutput = (id: string, type: string, content: string) => {
                const handler = win.shellHandlers?.[id];
                if (handler) handler(type, content);
            };
        }
        
        // Register handler for this specific call
        if (!win.shellHandlers) win.shellHandlers = {};
        win.shellHandlers[callbackId] = (type: string, content: string) => {
            if (isDone) return;

            if (onOutput) {
                onOutput(type, content);
            }

            if (type === 'EXIT') {
                cleanup();
                clearTimeout(timeout);
                if (content === '0') resolve(output.trim());
                else reject(new Error(`Command failed with exit code ${content}\nOutput: ${output}`));
            } else if (type === 'STDOUT') {
                output += content + '\n';
            } else if (type === 'STDERR') {
                output += content + '\n';
            } else if (type === 'ERROR') {
                cleanup();
                clearTimeout(timeout);
                reject(new Error(content));
            }
        };

        try {
            // Call native method with callbackId
            // If cwd or env is provided, we send a JSON string as the first argument
            if (cwd || env) {
                const options = JSON.stringify({ command, cwd, env });
                nativeBridge.call('executeShellCommand', options, callbackId);
            } else {
                nativeBridge.call('executeShellCommand', command, callbackId);
            }
        } catch (e) {
            cleanup();
            clearTimeout(timeout);
            reject(e);
        }
      });
    }
    throw new Error("Native shell not available in this environment.");
  }
}

export const nativeFileService = NativeFileService.getInstance();
