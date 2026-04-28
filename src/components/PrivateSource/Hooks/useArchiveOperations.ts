 
import { useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { usePrompt } from '../../../context/PromptContext';
import { useTaskStore } from '../../../store/taskStore';
import { FileItem } from '../types';

export function useArchiveOperations(
  apiCall: any,
  currentPath: string,
  loadDirectory: any,
  invalidateCache: any
) {
  const { showToast } = useToast();
  const { prompt } = usePrompt();
  const { addTask, updateTask, removeTask } = useTaskStore();

  const handleZip = useCallback(async (item: FileItem) => {
    const zipName = (await prompt('Zip file name:', `${item.name}.zip`))?.trim();
    if (!zipName) return;

    const taskId = await addTask({ name: `Zipping ${item.name}`, type: 'zip' });
    await updateTask(taskId, { status: 'running', progress: 10 });

    try {
      await apiCall('compress', { targetPaths: [item.path], destZipPath: `${currentPath}/${zipName}` });
      await updateTask(taskId, { status: 'completed', progress: 100 });
      invalidateCache(currentPath);
      loadDirectory(currentPath);
      showToast('Zipped successfully');
      setTimeout(() => removeTask(taskId), 3000);
    } catch (err: any) {
      await updateTask(taskId, { status: 'error', error: err.message, progress: 0 });
      showToast(err.message || 'Failed to zip');
    }
  }, [apiCall, currentPath, loadDirectory, prompt, showToast, invalidateCache, addTask, updateTask, removeTask]);

  const handleUnzip = useCallback(async (item: FileItem) => {
    const destName = (await prompt('Extract to folder name:', item.name.replace('.zip', '')))?.trim();
    if (!destName) return;

    const taskId = await addTask({ name: `Extracting ${item.name}`, type: 'unzip' });
    await updateTask(taskId, { status: 'running', progress: 10 });

    try {
      await apiCall('extract', { zipPath: item.path, destDirPath: `${currentPath}/${destName}` });
      await updateTask(taskId, { status: 'completed', progress: 100 });
      invalidateCache(currentPath);
      loadDirectory(currentPath);
      showToast('Extracted successfully');
      setTimeout(() => removeTask(taskId), 3000);
    } catch (err: any) {
      await updateTask(taskId, { status: 'error', error: err.message, progress: 0 });
      showToast(err.message || 'Failed to extract');
    }
  }, [apiCall, currentPath, loadDirectory, prompt, showToast, invalidateCache, addTask, updateTask, removeTask]);

  return { handleZip, handleUnzip };
}
