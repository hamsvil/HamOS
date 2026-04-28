/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { nativeBridge } from '../utils/nativeBridge';
import LightningFS from '@isomorphic-git/lightning-fs';

const fs = new LightningFS('fs');
const pfs = fs.promises;

const normalizePath = (path: string) => {
  if (!path) return '/';
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  return normalized.startsWith('/') ? normalized : '/' + normalized;
};

export const NativeStorageBulk = {
  getDiskUsage: async () => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'getDiskUsage', {});
        if (result) return result;
      }
    } catch (e) {}

    try {
      let totalSize = 0;
      const calculateSize = async (dir: string) => {
        const files = await pfs.readdir(dir);
        for (const file of files) {
          const fullPath = dir === '/' ? `/${file}` : `${dir}/${file}`;
          const stats = await pfs.stat(fullPath);
          if (stats.isDirectory()) {
            await calculateSize(fullPath);
          } else {
            totalSize += stats.size;
          }
        }
      };
      await calculateSize('/');
      return { totalSize };
    } catch (e) {
      return { totalSize: 0 };
    }
  },

  bulkWrite: async (options: { files: { path: string; data: string }[] }, writeFile: Function) => {
    try {
      if (nativeBridge.isAvailable()) {
        try {
            const result = nativeBridge.call('Android', 'bulkWrite', options);
            if (result) return result;
        } catch (e) {}

        let count = 0;
        const CHUNK_SIZE = 10;
        for (let i = 0; i < options.files.length; i += CHUNK_SIZE) {
            const chunk = options.files.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (file) => {
                try {
                    await nativeBridge.call('Android', 'writeFile', {
                        path: file.path,
                        data: file.data,
                        encoding: 'utf8'
                    });
                    count++;
                } catch (err) {}
            }));
            await new Promise(r => setTimeout(r, 5));
        }
        return { success: true, count };
      }
    } catch (e) {}

    let count = 0;
    for (const file of options.files) {
      try {
        await writeFile({
            path: file.path,
            data: file.data,
            encoding: 'utf8'
        });
        count++;
      } catch (e) {}
    }
    return { success: true, count };
  },

  bulkDelete: async (options: { paths: string[] }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'bulkDelete', options);
        if (result) return result;
      }
    } catch (e) {}

    for (const path of options.paths) {
      try { 
        const normalizedPath = normalizePath(path);
        await pfs.unlink(normalizedPath); 
      } catch (e) {}
    }
    return { success: true };
  },

  bulkRead: async (options: { paths: string[] }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const result = nativeBridge.call('Android', 'bulkRead', options);
        if (result) return result;
      }
    } catch (e) {}

    const files = [];
    for (const path of options.paths) {
      try {
        const normalizedPath = normalizePath(path);
        const data = await pfs.readFile(normalizedPath, 'utf8');
        files.push({ path, data: data.toString() });
      } catch (e) {}
    }
    return { files };
  },

  zip: async (options: { targetPaths: string[]; destZipPath: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const res = await nativeBridge.call('Android', 'zip', options);
        return typeof res === 'string' ? JSON.parse(res) : res;
      }
    } catch (e) {}

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const path of options.targetPaths) {
        const normalizedPath = normalizePath(path);
        const stats = await pfs.stat(normalizedPath);
        if (stats.isDirectory()) {
          const addFolder = async (dirPath: string, zipFolder: any) => {
            const files = await pfs.readdir(dirPath);
            for (const file of files) {
              const fullPath = `${dirPath}/${file}`;
              const s = await pfs.stat(fullPath);
              if (s.isDirectory()) {
                await addFolder(fullPath, zipFolder.folder(file));
              } else {
                const data = await pfs.readFile(fullPath);
                zipFolder.file(file, data);
              }
              // Yield to event loop to prevent UI freeze
              await new Promise(r => setTimeout(r, 0));
            }
          };
          await addFolder(normalizedPath, zip.folder(normalizedPath.split('/').pop() || 'folder'));
        } else {
          const data = await pfs.readFile(normalizedPath);
          zip.file(normalizedPath.split('/').pop() || 'file', data);
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const content = await zip.generateAsync({ type: 'uint8array' });
      const normalizedDest = normalizePath(options.destZipPath);
      await pfs.writeFile(normalizedDest, content);
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  unzip: async (options: { zipPath: string; destDirPath: string }) => {
    try {
      if (nativeBridge.isAvailable()) {
        const res = await nativeBridge.call('Android', 'unzip', options);
        return typeof res === 'string' ? JSON.parse(res) : res;
      }
    } catch (e) {}

    try {
      const JSZip = (await import('jszip')).default;
      const normalizedZip = normalizePath(options.zipPath);
      const normalizedDest = normalizePath(options.destDirPath);
      const data = await pfs.readFile(normalizedZip);
      const zip = await JSZip.loadAsync(data);
      const ensureDir = async (path: string) => {
        const parts = path.split('/');
        let current = '';
        for (const part of parts) {
          if (!part) continue;
          current += `/${part}`;
          try { await pfs.mkdir(current); } catch (e) {}
        }
      };
      
      const entries = Object.entries(zip.files);
      for (let i = 0; i < entries.length; i++) {
        const [filename, file] = entries[i];
        const destPath = normalizePath(`${normalizedDest}/${filename}`);
        if (file.dir) {
          await ensureDir(destPath);
        } else {
          const content = await file.async('uint8array');
          const dir = destPath.split('/').slice(0, -1).join('/');
          if (dir) await ensureDir(dir);
          await pfs.writeFile(destPath, content);
        }
        // Yield to event loop to prevent UI freeze
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  listDir: async (options: { path: string; recursive?: boolean }): Promise<{ path: string; isDirectory: boolean }[]> => {
    const results: { path: string; isDirectory: boolean }[] = [];
    const scan = async (dir: string) => {
      const normalizedDir = normalizePath(dir);
      const files = await pfs.readdir(normalizedDir);
      for (const file of files) {
        const fullPath = normalizedDir === '/' ? `/${file}` : `${normalizedDir}/${file}`;
        const stats = await pfs.stat(fullPath);
        results.push({ path: fullPath, isDirectory: stats.isDirectory() });
        if (options.recursive && stats.isDirectory()) {
          await scan(fullPath);
        }
      }
    };
    await scan(options.path);
    return results;
  }
};
