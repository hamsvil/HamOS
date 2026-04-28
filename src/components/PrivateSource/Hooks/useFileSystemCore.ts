 
/* eslint-disable no-case-declarations */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { NativeStorage } from '../../../plugins/NativeStorage';
import { EnvironmentChecker } from '../../../services/environmentChecker';
import { SyncService } from '../../../services/SyncService';
import { resilienceEngine } from '../../../services/ResilienceEngine';
import { FileItem } from '../types';

export function useFileSystemCore(token: string, isAuthenticated: boolean) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; total: number }>({ used: 0, total: 1024 * 1024 * 1024 });
  const cacheRef = useRef<Record<string, { items: FileItem[], timestamp: number }>>({});
  const { showToast } = useToast();

  const apiCall = useCallback(async (endpoint: string, body: any = {}) => {
    let fallbackData: any = undefined;
    if (endpoint === 'list') fallbackData = { items: [] };
    if (endpoint === 'disk-usage') fallbackData = { totalSize: 0 };

    return resilienceEngine.execute(endpoint, async () => {
      if (EnvironmentChecker.isNativeAndroid()) {
        try {
          switch (endpoint) {
            case 'list':
              const readdirRes = await NativeStorage.readdir({ path: body.dirPath || '' });
              const items = await Promise.all(readdirRes.files.map(async name => {
                const fullPath = body.dirPath ? `${body.dirPath}/${name}` : name;
                try {
                  const stat = await NativeStorage.stat({ path: fullPath });
                  return { name, isDirectory: stat.isDirectory, path: fullPath, size: stat.size, modifiedAt: stat.mtime };
                } catch (e) {
                  return { name, isDirectory: false, path: fullPath, size: 0, modifiedAt: Date.now() };
                }
              }));
              return { items: items.sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1)) };
            case 'read':
              const readRes = await NativeStorage.readFile({ path: body.filePath });
              return { content: readRes.data };
            case 'write':
              await NativeStorage.writeFile({ path: body.filePath, data: body.content });
              SyncService.syncToDevice(body.filePath, body.content);
              return { success: true };
            case 'mkdir':
              await NativeStorage.mkdir({ path: body.dirPath });
              SyncService.syncToDevice(body.dirPath, undefined, true);
              return { success: true };
            case 'delete':
              await NativeStorage.deleteFile({ path: body.targetPath });
              SyncService.removeFromDevice(body.targetPath);
              return { success: true };
            case 'batch-delete':
              await NativeStorage.bulkDelete({ paths: body.targetPaths });
              body.targetPaths.forEach((p: string) => SyncService.removeFromDevice(p));
              return { success: true };
            case 'move':
              await NativeStorage.rename({ oldPath: body.sourcePath, newPath: body.destPath });
              SyncService.renameOnDevice(body.sourcePath, body.destPath);
              return { success: true };
            case 'copy':
              await NativeStorage.copyFile({ sourcePath: body.sourcePath, destPath: body.destPath });
              return { success: true };
            case 'compress':
              await NativeStorage.zip({ targetPaths: body.targetPaths, destZipPath: body.destZipPath });
              return { success: true };
            case 'extract':
              await NativeStorage.unzip({ zipPath: body.zipPath, destDirPath: body.destDirPath });
              return { success: true };
            case 'disk-usage':
              return await NativeStorage.getDiskUsage();
          }
        } catch (e: any) {
          const isCritical = e.message?.includes('Permission') || e.message?.includes('Quota') || e.message?.includes('Full');
          if (isCritical) {
            console.error(`CRITICAL NATIVE FAILURE for ${endpoint}:`, e.message);
            showToast(`Native Storage Error: ${e.message}. Falling back to API...`, 'error');
          } else {
            console.warn(`Native storage failed for ${endpoint}, falling back to API:`, e);
          }
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/ham-api/private-source/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401 || res.status === 403) throw new Error(`AUTH_ERROR: ${errText || 'Invalid Access Key'}`);
        if (res.status === 400) throw new Error(`BAD_REQUEST: ${errText}`);
        throw new Error(errText || `HTTP Error ${res.status}`);
      }
      return res.json();
    }, fallbackData);
  }, [token, showToast]);

  const invalidateCache = useCallback((path: string) => {
    delete cacheRef.current[path];
  }, []);

  const loadDirectory = useCallback(async (dirPath: string, showLoading = true, retries = 3) => {
    const CACHE_TTL = 5000;
    const cached = cacheRef.current[dirPath];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setItems(cached.items);
      setCurrentPath(dirPath);
      apiCall('disk-usage').then(usageData => {
        setQuota({
          used: usageData.used || cached.items.reduce((acc: number, i: any) => acc + (i.size || 0), 0) || 0,
          total: usageData.total || 1024 * 1024 * 1024
        });
      }).catch(() => {});
      return;
    }

    if (showLoading) setLoading(true);
    setError(null);

    let attempt = 0;
    while (attempt < retries) {
      try {
        const data = await apiCall('list', { dirPath });
        const newItems = data.items || [];
        setItems(newItems);
        setCurrentPath(dirPath);
        cacheRef.current[dirPath] = { items: newItems, timestamp: Date.now() };
        
        try {
          const usageData = await apiCall('disk-usage');
          setQuota({
            used: usageData.used || newItems.reduce((acc: number, i: any) => acc + (i.size || 0), 0) || 0,
            total: usageData.total || 1024 * 1024 * 1024
          });
        } catch (e) {}
        
        if (showLoading) setLoading(false);
        return;
      } catch (err: any) {
        attempt++;
        if (attempt >= retries) {
          setError(err.message || 'Failed to load directory');
          if (dirPath !== '' && (err.message?.includes('not found') || err.message?.includes('ENOENT'))) {
            showToast('Directory not found. Returning to root.', 'warning');
            loadDirectory('');
          } else if (showLoading) {
            showToast(err.message || 'Failed to load directory', 'error');
          }
          if (showLoading) setLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }, [apiCall, showToast]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDirectory(currentPath);
      let ws: WebSocket | null = null;
      let reconnectTimer: any = null;
      let isComponentMounted = true;

      const connectWs = () => {
        if (!isComponentMounted) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/collab?roomId=private-source-presence`);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'FS_EVENT') {
              invalidateCache(currentPath);
              loadDirectory(currentPath, false);
            }
          } catch (e) {}
        };
        ws.onclose = () => {
          if (isComponentMounted) reconnectTimer = setTimeout(connectWs, 3000);
        };
      };

      connectWs();
      return () => {
        isComponentMounted = false;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (ws) ws.close();
      };
    }
  }, [isAuthenticated, currentPath, loadDirectory, invalidateCache]);

  return { items, setItems, currentPath, setCurrentPath, loading, error, quota, apiCall, loadDirectory, invalidateCache };
}
