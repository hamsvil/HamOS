 
import { useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { usePrompt } from '../../../context/PromptContext';
import { useTaskStore } from '../../../store/taskStore';
import { resilienceEngine } from '../../../services/ResilienceEngine';
import { EnvironmentChecker } from '../../../services/environmentChecker';
import { NativeStorage } from '../../../plugins/NativeStorage';

export function useBulkOperations(
  apiCall: any,
  currentPath: string,
  loadDirectory: any,
  invalidateCache: any,
  token: string
) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { prompt } = usePrompt();
  const { addTask, updateTask, removeTask } = useTaskStore();

  const handleBulkDelete = useCallback(async (paths: string[]) => {
    if (await confirm(`Move ${paths.length} items to Trash?`)) {
      await resilienceEngine.execute('bulk-delete-transaction', async () => {
        const taskId = await addTask({ name: `Moving ${paths.length} items to Trash`, type: 'delete' });
        await updateTask(taskId, { status: 'running', progress: 10 });

        try {
          try { await apiCall('mkdir', { dirPath: '.trash' }); } catch (e) {}
          
          const total = paths.length;
          let completed = 0;

          await Promise.all(paths.map(async (path) => {
            const name = path.split('/').pop();
            await apiCall('move', { sourcePath: path, destPath: `.trash/${name}` });
            completed++;
            await updateTask(taskId, { progress: 10 + (completed / total) * 80 });
          }));

          invalidateCache(currentPath);
          invalidateCache('.trash');
          loadDirectory(currentPath);
          showToast(`Moved ${paths.length} items to trash`);
          await updateTask(taskId, { status: 'completed', progress: 100 });
          setTimeout(() => removeTask(taskId), 3000);
        } catch (err: any) {
          await updateTask(taskId, { status: 'error', error: err.message, progress: 0 });
          showToast(err.message || 'Failed to move some items to trash');
          throw err;
        }
      });
    }
  }, [apiCall, currentPath, loadDirectory, confirm, showToast, invalidateCache, addTask, updateTask, removeTask]);

  const handleBulkMove = useCallback(async (paths: string[], destPath: string) => {
    if (destPath === currentPath) return;
    await resilienceEngine.execute('bulk-move-transaction', async () => {
      const taskId = await addTask({ name: `Moving ${paths.length} items to ${destPath}`, type: 'move' });
      await updateTask(taskId, { status: 'running', progress: 10 });

      try {
        const total = paths.length;
        let completed = 0;

        await Promise.all(paths.map(async (path) => {
          const name = path.split('/').pop();
          await apiCall('move', { sourcePath: path, destPath: `${destPath}/${name}` });
          completed++;
          await updateTask(taskId, { progress: 10 + (completed / total) * 80 });
        }));

        invalidateCache(currentPath);
        invalidateCache(destPath);
        loadDirectory(currentPath);
        showToast(`Moved ${paths.length} items successfully`);
        await updateTask(taskId, { status: 'completed', progress: 100 });
        setTimeout(() => removeTask(taskId), 3000);
      } catch (err: any) {
        await updateTask(taskId, { status: 'error', error: err.message, progress: 0 });
        showToast(err.message || 'Failed to move some items');
        throw err;
      }
    });
  }, [apiCall, currentPath, loadDirectory, showToast, invalidateCache, addTask, updateTask, removeTask]);

  const handleBulkCopy = useCallback(async (paths: string[], destPath: string) => {
    await resilienceEngine.execute('bulk-copy-transaction', async () => {
      const taskId = await addTask({ name: `Copying ${paths.length} items to ${destPath}`, type: 'copy' });
      await updateTask(taskId, { status: 'running', progress: 10 });

      try {
        const total = paths.length;
        let completed = 0;

        await Promise.all(paths.map(async (path) => {
          const name = path.split('/').pop();
          await apiCall('copy', { sourcePath: path, destPath: `${destPath}/${name}` });
          completed++;
          await updateTask(taskId, { progress: 10 + (completed / total) * 80 });
        }));

        invalidateCache(currentPath);
        invalidateCache(destPath);
        loadDirectory(currentPath);
        showToast(`Copied ${paths.length} items successfully`);
        await updateTask(taskId, { status: 'completed', progress: 100 });
        setTimeout(() => removeTask(taskId), 3000);
      } catch (err: any) {
        await updateTask(taskId, { status: 'error', error: err.message, progress: 0 });
        showToast(err.message || 'Failed to copy some items');
        throw err;
      }
    });
  }, [apiCall, currentPath, loadDirectory, showToast, invalidateCache, addTask, updateTask, removeTask]);

  const handleBulkZip = useCallback(async (paths: string[]) => {
    const zipName = (await prompt('Zip file name:', 'archive.zip'))?.trim();
    if (!zipName) return;

    await resilienceEngine.execute('bulk-zip-transaction', async () => {
      const taskId = await addTask({ name: `Zipping ${paths.length} items`, type: 'zip' });
      await updateTask(taskId, { status: 'running', progress: 10 });

      try {
        await apiCall('compress', { targetPaths: paths, destZipPath: `${currentPath}/${zipName}` });
        await updateTask(taskId, { status: 'completed', progress: 100 });
        invalidateCache(currentPath);
        loadDirectory(currentPath);
        showToast('Zipped successfully');
        setTimeout(() => removeTask(taskId), 3000);
      } catch (err: any) {
        await updateTask(taskId, { status: 'error', error: err.message, progress: 0 });
        showToast(err.message || 'Failed to zip items');
        throw err;
      }
    });
  }, [apiCall, currentPath, loadDirectory, prompt, showToast, invalidateCache, addTask, updateTask, removeTask]);

  const handleBulkDownload = useCallback(async (paths: string[]) => {
    await resilienceEngine.execute('bulk-download-transaction', async () => {
      const taskId = await addTask({ name: `Preparing ${paths.length} items for download`, type: 'download' });
      await updateTask(taskId, { status: 'running', progress: 10 });

      let zipPath = '';
      try {
        const zipName = `download_${Date.now()}.zip`;
        zipPath = `${currentPath}/${zipName}`;
        await apiCall('compress', { targetPaths: paths, destZipPath: zipPath });
        await updateTask(taskId, { name: 'Downloading archive...', progress: 50 });

        const { saveAs } = await import('file-saver');
        if (EnvironmentChecker.isNativeAndroid()) {
          const res = await NativeStorage.readFile({ path: zipPath, encoding: 'base64' });
          const byteCharacters = atob(res.data as string);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray]);
          saveAs(blob, zipName);
        } else {
          const response = await resilienceEngine.execute('download-fetch', async () => {
            const res = await fetch(`/ham-api/private-source/download?path=${encodeURIComponent(zipPath)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Download failed');
            return res;
          }) as Response;
          const blob = await response.blob();
          saveAs(blob, zipName);
        }
        
        await updateTask(taskId, { name: 'Cleaning up...', progress: 90 });
        await apiCall('delete', { targetPath: zipPath });
        await updateTask(taskId, { status: 'completed', progress: 100 });
        showToast('Download complete');
        setTimeout(() => removeTask(taskId), 3000);
      } catch (err: any) {
        await updateTask(taskId, { status: 'error', error: err.message, progress: 0 });
        showToast(err.message || 'Bulk download failed');
        if (zipPath) apiCall('delete', { targetPath: zipPath }).catch(() => {});
        throw err;
      }
    });
  }, [apiCall, currentPath, token, showToast, addTask, updateTask, removeTask]);

  return { handleBulkDelete, handleBulkMove, handleBulkCopy, handleBulkZip, handleBulkDownload };
}
