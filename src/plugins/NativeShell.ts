/* eslint-disable no-useless-assignment */
import { nativeBridge } from '../utils/nativeBridge';
import { nativeFileService } from '../services/nativeFileService';
import { EnvironmentChecker } from '../services/environmentChecker';

export interface NativeShellPlugin {
  executeCommand(options: { command: string; cwd?: string; env?: Record<string, string> }): Promise<{ output: string; exitCode: number }>;
  checkBinary(binary: string): Promise<boolean>;
  spawnSession(options: { shell?: string; cwd?: string; env?: Record<string, string> }): Promise<{ sessionId: string }>;
  writeToSession(options: { sessionId: string; data: string }): Promise<void>;
  resizeSession(options: { sessionId: string; cols: number; rows: number }): Promise<void>;
  killSession(options: { sessionId: string }): Promise<void>;
}

export const NativeShell: NativeShellPlugin = {
  executeCommand: async (options) => {
      if (!EnvironmentChecker.isNativeAndroid()) {
          throw new Error("Native shell not available in web environment.");
      }
      try {
          const output = await nativeFileService.executeShellCommand(options.command, undefined, 30000, options.cwd, options.env);
          return { output, exitCode: 0 };
      } catch (e: any) {
          return { output: e.message || String(e), exitCode: 1 };
      }
  },
  checkBinary: async (binary) => {
      if (!EnvironmentChecker.isNativeAndroid()) return false;
      // Simple check via 'which' or 'type'
      try {
          await nativeFileService.executeShellCommand(`which ${binary}`);
          return true;
      } catch (e) {
          return false;
      }
  },
  spawnSession: async (options) => {
      if (!EnvironmentChecker.isNativeAndroid()) return { sessionId: '' };
      return nativeBridge.call('spawnSession', options) || { sessionId: '' };
  },
  writeToSession: async (options) => {
      if (!EnvironmentChecker.isNativeAndroid()) return;
      return nativeBridge.call('writeToSession', options);
  },
  resizeSession: async (options) => {
      if (!EnvironmentChecker.isNativeAndroid()) return;
      return nativeBridge.call('resizeSession', options);
  },
  killSession: async (options) => {
      if (!EnvironmentChecker.isNativeAndroid()) return;
      return nativeBridge.call('killSession', options);
  },
};
