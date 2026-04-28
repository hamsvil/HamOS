/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
/**
 * Native Bridge Utility for AIDE/Android WebView
 * Provides a safe interface to call native Android functions via window.android or window.AndroidBuilder
 */
import { LoggerService } from '../services/LoggerService';

class NativeSecurityGateway {
  // Pendekatan Whitelist: Hanya perintah dasar ini yang diizinkan dieksekusi oleh AI/Sistem.
  private static ALLOWED_BASE_COMMANDS = new Set([
    'ls', 'cat', 'echo', 'pwd', 'git', 'npm', 'node', 'yarn', 'pnpm', 'tsc', 
    'mkdir', 'touch', 'cp', 'mv', 'grep', 'find', 'npx', 'bun', 'deno', 
    'python', 'python3', 'pip', 'java', 'javac', 'gradle', 'go', 'rustc', 
    'cargo', 'make', 'cmake', 'gcc', 'g++', 'clang', 'clang++', 'rm', 'clear',
    'whoami', 'date', 'head', 'tail', 'less', 'more', 'wc', 'awk', 'sed', 'tar', 'unzip', 'zip'
  ]);

  public static sanitizeCommand(command: string): boolean {
    const trimmedCmd = command.trim();
    if (!trimmedCmd) return false;

    // Split by common shell operators to check each sub-command
    const subCommands = trimmedCmd.split(/(?:&&|\|\||\||;)/);

    for (const subCmd of subCommands) {
      const cleanSubCmd = subCmd.trim();
      if (!cleanSubCmd) continue;

      // Extract the base command (first word)
      const baseCommand = cleanSubCmd.split(/\s+/)[0].toLowerCase();

      if (!this.ALLOWED_BASE_COMMANDS.has(baseCommand)) {
        LoggerService.warn('NativeBridge', `[SECURITY BLOCK] Command not in whitelist: ${baseCommand} (Full command: ${command})`);
        return false; // Blocked
      }

      // Additional strict checks for specific commands like 'rm' to prevent catastrophic deletion
      if (baseCommand === 'rm') {
        if (cleanSubCmd.includes('/') && (cleanSubCmd.includes(' -rf ') || cleanSubCmd.includes(' -fr ') || cleanSubCmd.includes(' -r '))) {
           // Block recursive rm on absolute paths or root-like paths
           if (cleanSubCmd.match(/\s+\/[a-zA-Z0-9_]*/)) {
               LoggerService.warn('NativeBridge', `[SECURITY BLOCK] Dangerous rm pattern detected: ${cleanSubCmd}`);
               return false;
           }
        }
      }
    }
    
    return true; // Allowed
  }
}

export const nativeBridge = {
  // Check if native interface is available (supports both standard Android and AndroidBuilder interfaces)
  isAvailable: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!((window as any).Android || (window as any).AndroidBuilder);
  },

  // Check specifically for the Builder interface
  isBuilderAvailable: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!(window as any).AndroidBuilder;
  },

  // Asynchronous, non-blocking Hybrid communication channel (Termux Override ON)
  callAsync: <T = any>(...args: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Window undefined'));

      let interfaceName: 'Android' | 'AndroidBuilder' = 'Android';
      let functionName: string;
      let functionArgs: any[];

      if (args.length > 0 && (args[0] === 'Android' || args[0] === 'AndroidBuilder')) {
          interfaceName = args[0];
          functionName = args[1];
          functionArgs = args.slice(2);
      } else {
          functionName = args[0];
          functionArgs = args.slice(1);
      }

      // Security Gateway Interception
      if ((functionName === 'executeShellCommand' || functionName === 'spawnSession') && functionArgs.length > 0) {
          const commandOrOptions = functionArgs[0];
          const command = typeof commandOrOptions === 'string' ? commandOrOptions : (commandOrOptions.shell || '');
          if (typeof command === 'string' && !NativeSecurityGateway.sanitizeCommand(command)) {
              return reject(new Error("Security Exception: Command blocked by NativeSecurityGateway."));
          }
      }

      const targetInterface = (window as any)[interfaceName];
      
      if (targetInterface && typeof targetInterface[functionName] === 'function') {
        try {
          // Create a unique callback ID for this request to prevent memory leaks
          const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          
          // Setup global callback handler if it doesn't exist
          if (!(window as any).__nativeBridgeCallbacks) {
            (window as any).__nativeBridgeCallbacks = {};
            (window as any).__nativeBridgeCallbackHandler = (id: string, result: any, error: any) => {
              const cb = (window as any).__nativeBridgeCallbacks[id];
              if (cb) {
                if (error) cb.reject(new Error(error));
                else cb.resolve(result);
                delete (window as any).__nativeBridgeCallbacks[id]; // Prevent memory leak
              }
            };
          }

          // Register callback with timeout to prevent memory leaks
          const timeout = setTimeout(() => {
            const cb = (window as any).__nativeBridgeCallbacks[callbackId];
            if (cb) {
              cb.reject(new Error(`NativeBridge timeout after 30s calling ${functionName}`));
              delete (window as any).__nativeBridgeCallbacks[callbackId];
              // Cleanup global handler if no more callbacks
              if (Object.keys((window as any).__nativeBridgeCallbacks).length === 0) {
                // delete (window as any).__nativeBridgeCallbackHandler; // Keep handler to avoid recreate, but could be cleared
              }
            }
          }, 30000);

          (window as any).__nativeBridgeCallbacks[callbackId] = { 
            resolve: (res: any) => {
              clearTimeout(timeout);
              resolve(res);
            }, 
            reject: (err: any) => {
              clearTimeout(timeout);
              reject(err);
            } 
          };

          // Process arguments, appending callbackId for the native side to use
          const processedArgs = functionArgs.map(arg => 
            (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : arg
          );
          
          // Call native function. The native side should be updated to accept callbackId and use Coroutines.
          // Fallback to synchronous if native doesn't support async yet
          const result = targetInterface[functionName](...processedArgs, callbackId);
          
          // If the native method is still synchronous and returns immediately
          if (result !== undefined && result !== 'ASYNC_DEFERRED') {
            delete (window as any).__nativeBridgeCallbacks[callbackId];
            
            if (typeof result === 'string') {
              const trimmed = result.trim();
              if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                  (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                  return resolve(JSON.parse(trimmed) as T);
                } catch (e) {
                  return resolve(result as unknown as T);
                }
              }
            }
            resolve(result);
          }
        } catch (error: any) {
          LoggerService.error('NativeBridge', `Error calling native function ${interfaceName}.${functionName}`, error);
          reject(error);
        }
      } else {
        if (targetInterface) {
           LoggerService.warn('NativeBridge', `Native function ${interfaceName}.${functionName} not found`);
        }
        reject(new Error(`Native function not found: ${functionName}`));
      }
    });
  },

  // Legacy synchronous call (deprecated, use callAsync)
  call: <T = any>(...args: any[]): T | null => {
    if (typeof window === 'undefined') return null;

    let interfaceName: 'Android' | 'AndroidBuilder' = 'Android';
    let functionName: string;
    let functionArgs: any[];

    // Determine signature
    if (args.length > 0 && (args[0] === 'Android' || args[0] === 'AndroidBuilder')) {
        interfaceName = args[0];
        functionName = args[1];
        functionArgs = args.slice(2);
    } else {
        functionName = args[0];
        functionArgs = args.slice(1);
    }

    // Security Gateway Interception
    if ((functionName === 'executeShellCommand' || functionName === 'spawnSession') && functionArgs.length > 0) {
        const commandOrOptions = functionArgs[0];
        const command = typeof commandOrOptions === 'string' ? commandOrOptions : (commandOrOptions.shell || '');
        if (typeof command === 'string' && !NativeSecurityGateway.sanitizeCommand(command)) {
            throw new Error("Security Exception: Command blocked by NativeSecurityGateway.");
        }
    }

    if (functionName === 'writeToSession' && functionArgs.length > 0) {
        const options = functionArgs[0];
        if (options && typeof options.data === 'string') {
            // We don't block all data (it could be a password or interactive input)
            // but we can log suspicious patterns if needed.
        }
    }

    const targetInterface = (window as unknown)[interfaceName];
    
    if (targetInterface && typeof targetInterface[functionName] === 'function') {
      try {
        // Stringify object arguments for Android @JavascriptInterface compatibility
        // Primitive types (string, number, boolean) are passed as is
        const processedArgs = functionArgs.map(arg => 
          (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : arg
        );
        
        const result = targetInterface[functionName](...processedArgs);
        
        // If result is a string that looks like JSON, try to parse it
        if (typeof result === 'string') {
          const trimmed = result.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
              (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              return JSON.parse(trimmed) as T;
            } catch (e) {
              // Not valid JSON, return as string
              return result as unknown as T;
            }
          }
        }
        
        return result;
      } catch (error: any) {
        LoggerService.error('NativeBridge', `Error calling native function ${interfaceName}.${functionName}`, error);
        throw error;
      }
    } else {
      // Function missing is common in older versions or different environments
      // We throw specific error so callers can distinguish missing function vs execution error
      // Only throw if the interface itself exists but the function is missing
      if (targetInterface) {
         // throw new Error(`Native function ${interfaceName}.${functionName} not found`);
         LoggerService.warn('NativeBridge', `Native function ${interfaceName}.${functionName} not found`);
      }
      return null;
    }
  },
};
