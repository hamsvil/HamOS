/* eslint-disable no-useless-assignment */

import { io, Socket } from 'socket.io-client';
import { EnvironmentChecker } from './environmentChecker';
import { webcontainerService } from './webcontainerService';
import { ShellSanitizer } from './shell/ShellSanitizer';
import { AndroidStrategy, WebContainerStrategy, CloudShellStrategy, ChamsStrategy, ShellResult } from './shell/ExecutionStrategy';
import { NativeShell } from '../plugins/NativeShell';

let shellSocket: Socket | null = null;

export const getShellSocket = (): Socket => {
  if (!shellSocket) {
    const serverUrl = window.location.origin;
    shellSocket = io(serverUrl, {
      path: '/terminal-socket/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000
    });
  }
  return shellSocket;
};

interface WindowWithShell extends Window {
  shellHandlers?: Record<string, (type: string, content: string) => void>;
  onShellOutput?: (id: string, type: string, content: string) => void;
}

export const executeShellCommand = async (command: string, forceServer: boolean = false): Promise<ShellResult> => {
  const { sanitized, isDangerous, error } = ShellSanitizer.sanitize(command);
  if (isDangerous) return { output: error || 'Dangerous command blocked.', isError: true };

  // 0. cHams DSL Execution Interceptor
  if (sanitized.trim().startsWith('chams ')) {
    try {
      return await new ChamsStrategy().execute(sanitized);
    } catch (e: any) {
      return { output: `[System Error] ${e.message}`, isError: true };
    }
  }

  // 1. Native Android
  if (EnvironmentChecker.isNativeAndroid() && !forceServer) {
    try {
      return await new AndroidStrategy().execute(sanitized);
    } catch {}
  }

  // 2. WebContainer
  if (!EnvironmentChecker.isNativeAndroid() && !forceServer) {
    try {
      const result = await new WebContainerStrategy().execute(sanitized);
      if (!result.output.includes('not found')) return result;
    } catch {}
  }

  // 3. Cloud Shell (HTTP)
  try {
    return await new CloudShellStrategy().execute(sanitized);
  } catch {}

  // 4. Fallback: WebSocket
  return new Promise((resolve) => {
    const socket = getShellSocket();
    const execute = () => {
      const timeout = setTimeout(() => {
        resolve({ output: 'Error: Cloud Shell timeout.', isError: true });
      }, 300000);

      socket.emit('execute_command', { command: sanitized }, (response: ShellResult) => {
        clearTimeout(timeout);
        resolve(response);
      });
    };

    if (socket.connected) {
      execute();
    } else {
      socket.once('connect', execute);
      socket.connect();
    }
  });
};

export const shellService = {
  execute: executeShellCommand,
  
  zombieSweeper: async () => {
    const commands = ['pkill -f node', 'fuser -k 3000/tcp', 'fuser -k 5173/tcp'];
    for (const cmd of commands) {
      await executeShellCommand(cmd);
    }
    return true;
  },

  spawnInteractive: async (options: { cols: number; rows: number; shell?: string; cwd?: string; env?: Record<string, string> }) => {
    if (EnvironmentChecker.isNativeAndroid()) {
      const { sessionId } = await NativeShell.spawnSession({ 
        shell: options.shell,
        cwd: options.cwd,
        env: options.env
      });
      
      const win = window as unknown as WindowWithShell;
      if (!win.onShellOutput) {
        win.onShellOutput = (id: string, type: string, content: string) => {
          win.shellHandlers?.[id]?.(type, content);
        };
      }
      if (!win.shellHandlers) win.shellHandlers = {};

      const outputStream = new ReadableStream({
        start(controller) {
          win.shellHandlers![sessionId] = (type: string, content: string) => {
            if (type === 'STDOUT' || type === 'STDERR') controller.enqueue(content);
            else if (type === 'EXIT') controller.close();
          };
        },
        cancel() {
          delete win.shellHandlers![sessionId];
          NativeShell.killSession({ sessionId });
        }
      });

      return {
        output: outputStream,
        input: {
          getWriter: () => ({
            write: (data: string) => NativeShell.writeToSession({ sessionId, data }),
            close: () => NativeShell.killSession({ sessionId })
          })
        },
        resize: (size: { cols: number; rows: number }) => NativeShell.resizeSession({ sessionId, ...size }),
        kill: () => NativeShell.killSession({ sessionId })
      };
    }

    // Node.js Backend
    try {
      return await new Promise<any>((resolve, reject) => {
        const socket = io(window.location.origin, {
          path: '/terminal-socket/',
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelayMax: 5000
        });

        socket.on('connect', () => {
          socket.emit('start_terminal', { cols: options.cols, rows: options.rows, cwd: options.cwd });
          
          const outputStream = new ReadableStream({
            start(controller) {
              socket.on('terminal_output', (data: string) => controller.enqueue(data));
            },
            cancel() {
              socket.disconnect();
            }
          });

          resolve({
            output: outputStream,
            input: {
              getWriter: () => ({
                write: (data: string) => socket.emit('terminal_input', data),
                close: () => socket.disconnect()
              })
            },
            resize: (size: { cols: number; rows: number }) => socket.emit('resize_terminal', size),
            kill: () => socket.disconnect(),
            socket
          });
        });

        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });
    } catch (e) {
      // WebContainer Fallback
      const process = await webcontainerService.spawn(options.shell || 'jsh', [], {
        terminal: { cols: options.cols, rows: options.rows },
      });

      return {
        output: process.output,
        input: process.input,
        resize: (size: { cols: number; rows: number }) => process.resize?.(size),
        kill: () => process.kill()
      };
    }
  }
};

