import { nativeBridge } from '../utils/nativeBridge';

export interface NativeGitPlugin {
  clone(options: { url: string; path: string; token?: string }): Promise<{ success: boolean; message: string }>;
  checkGitBinary(): Promise<boolean>;
  commit(options: { path: string; message: string; authorName: string; authorEmail: string }): Promise<{ success: boolean; hash: string }>;
  push(options: { path: string; remote: string; branch: string; token?: string }): Promise<{ success: boolean; message: string }>;
  pull(options: { path: string; remote: string; branch: string; token?: string }): Promise<{ success: boolean; message: string }>;
  status(options: { path: string }): Promise<{ status: any }>;
}

export const NativeGit: NativeGitPlugin = {
  clone: async (options) => nativeBridge.call('clone', options) || { success: false, message: 'Bridge unavailable' },
  checkGitBinary: async () => (await nativeBridge.call('checkGitBinary', {}))?.exists || false,
  commit: async (options) => nativeBridge.call('commit', options) || { success: false, hash: '' },
  push: async (options) => nativeBridge.call('push', options) || { success: false, message: 'Bridge unavailable' },
  pull: async (options) => nativeBridge.call('pull', options) || { success: false, message: 'Bridge unavailable' },
  status: async (options) => nativeBridge.call('status', options) || { status: null },
};
