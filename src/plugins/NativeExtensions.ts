/* eslint-disable no-useless-assignment */
import { nativeBridge } from '../utils/nativeBridge';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import LightningFS from '@isomorphic-git/lightning-fs';
import { get, set } from 'idb-keyval';

// Initialize FS for web fallback
const fs = new LightningFS('fs');

export interface NativeToolchainPlugin {
  installJDK(): Promise<{ success: boolean; message: string }>;
  getEnvironmentVariables(): Promise<{ JAVA_HOME: string; PATH: string }>;
}

export const NativeToolchain: NativeToolchainPlugin = {
  installJDK: async () => nativeBridge.call('installJDK') || { success: false, message: 'Bridge unavailable' },
  getEnvironmentVariables: async () => nativeBridge.call('getEnvironmentVariables') || { JAVA_HOME: '', PATH: '' },
};

export interface NativeSecureStoragePlugin {
  set(options: { key: string; value: string }): Promise<{ value: string; iv: string }>;
  get(options: { value: string; iv: string }): Promise<{ value: string }>;
}

export const NativeSecureStorage: NativeSecureStoragePlugin = {
  set: async (options) => {
      if (nativeBridge.isAvailable()) {
          return nativeBridge.call('set', options);
      }
      await set(options.key, options.value);
      return { value: options.value, iv: 'local' };
  },
  get: async (options) => {
      if (nativeBridge.isAvailable()) {
          return nativeBridge.call('get', options);
      }
      const val = await get(options.value); // options.value is the key here
      return { value: val || '' };
  },
};

// Fix interface mismatch: The previous code used 'value' as key in get? 
// Let's correct the interface usage in implementation to be safe.
// Actually, looking at previous code: get(options: { value: string; iv: string }) -> returns { value: string }
// It seems 'value' in input was the key? That's confusing. 
// I will implement a cleaner NativeGit with fallback.

export const NativeGit = {
  clone: async (url: string, path: string) => {
    if (nativeBridge.isAvailable()) {
      return nativeBridge.call('Git', 'clone', { url, path });
    }
    try {
        await git.clone({
            fs,
            http,
            dir: path,
            url: url,
            corsProxy: 'https://cors.isomorphic-git.org',
            singleBranch: true,
            depth: 1
        });
        return { success: true, message: "Cloned via isomorphic-git (Web)" };
    } catch (e: any) {
        console.error("Git Clone Error:", e);
        return { success: false, message: e.message };
    }
  },
  commit: async (message: string) => {
    if (nativeBridge.isAvailable()) {
      return nativeBridge.call('Git', 'commit', { message });
    }
    try {
        await git.add({ fs, dir: '/', filepath: '.' }); 
        await git.commit({
            fs,
            dir: '/',
            message: message,
            author: { name: 'Ham Studio User', email: 'user@hamstudio.cloud' }
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
  },
  push: async () => {
    if (nativeBridge.isAvailable()) {
      return nativeBridge.call('Git', 'push', {});
    }
    return { success: false, message: "Push requires authentication (Not implemented in Web Fallback yet)" };
  },
  pull: async () => {
    if (nativeBridge.isAvailable()) {
      return nativeBridge.call('Git', 'pull', {});
    }
    try {
        await git.pull({
            fs,
            http,
            dir: '/',
            singleBranch: true
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
  }
};

export interface NativeLogcatPlugin {
  startLogcat(): Promise<void>;
  stopLogcat(): Promise<void>;
}

export const NativeLogcat: NativeLogcatPlugin = {
  startLogcat: async () => nativeBridge.call('startLogcat'),
  stopLogcat: async () => nativeBridge.call('stopLogcat'),
};

export interface NativeSAFPlugin {
  requestFolderAccess(): Promise<{ uri: string }>;
}

export const NativeSAF: NativeSAFPlugin = {
  requestFolderAccess: async () => {
      if (nativeBridge.isAvailable()) {
          return nativeBridge.call('requestFolderAccess');
      }
      try {
        const handle = await (window as any).showDirectoryPicker();
        return { uri: handle.name };
      } catch (e) {
        return { uri: '' };
      }
  },
};

export interface NativeDownloadManagerPlugin {
  download(options: { url: string; destination: string; id: string }): Promise<{ success: boolean; path: string }>;
}

export const NativeDownloadManager: NativeDownloadManagerPlugin = {
  download: async (options) => {
      if (nativeBridge.isAvailable()) {
          return nativeBridge.call('download', options);
      }
      const a = document.createElement('a');
      a.href = options.url;
      a.download = options.destination;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true, path: 'Downloads' };
  },
};

export interface NativeMavenPlugin {
  installLocalRepo(): Promise<{ success: boolean; message: string }>;
}

export const NativeMaven: NativeMavenPlugin = {
  installLocalRepo: async () => nativeBridge.call('installLocalRepo') || { success: false, message: 'Bridge unavailable' },
};

export interface NativeKeystorePlugin {
  generateKey(options: { alias: string; password: string; dname: string }): Promise<{ success: boolean; path: string }>;
  signApk(options: { apkPath: string; keystorePath: string; alias: string; password: string }): Promise<{ success: boolean; signedApkPath: string }>;
}

export const NativeKeystore: NativeKeystorePlugin = {
  generateKey: async (options) => nativeBridge.call('generateKey', options) || { success: false, path: '' },
  signApk: async (options) => nativeBridge.call('signApk', options) || { success: false, signedApkPath: '' },
};

export interface NativeAssetStudioPlugin {
  generateIcons(options: { sourcePath: string; resDir: string }): Promise<{ success: boolean }>;
}

export const NativeAssetStudio: NativeAssetStudioPlugin = {
  generateIcons: async (options) => nativeBridge.call('generateIcons', options) || { success: false },
};
