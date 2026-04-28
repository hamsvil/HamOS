/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-catch */
import { opfsSyncService } from '../services/vfs/opfsSyncService';

// Safe FS polyfill that only operates in the browser
// This prevents Vite/Node.js build crashes (ENOENT package.json)
const isBrowser = typeof window !== 'undefined';

export const fs = {
  readFileSync: (path: string, options?: any) => {
    if (!isBrowser) return Buffer.from('');
    try {
      const data = opfsSyncService.readFileSync(path);
      if (!data) throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      return options?.encoding === 'utf8' ? new TextDecoder().decode(data) : data;
    } catch (e) {
      throw e;
    }
  },
  writeFileSync: (path: string, data: string | Uint8Array) => {
    if (!isBrowser) return;
    opfsSyncService.writeFileSync(path, data);
  },
  existsSync: (path: string) => {
    if (!isBrowser) return false;
    try {
      return opfsSyncService.readFileSync(path) !== null;
    } catch {
      return false;
    }
  },
  mkdirSync: (path: string, options?: any) => {
    if (!isBrowser) return;
    // OPFS handles directories implicitly in our flat/hybrid structure,
    // but we can simulate it or ignore it safely for WebContainer compat.
  },
  statSync: (path: string) => {
    if (!isBrowser) throw new Error('Not in browser');
    const data = opfsSyncService.readFileSync(path);
    if (!data) throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    return {
      isFile: () => true,
      isDirectory: () => false,
      size: data.length,
      mtime: new Date()
    };
  }
};

export default fs;
