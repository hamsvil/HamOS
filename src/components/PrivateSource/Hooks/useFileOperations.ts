 
import { useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { usePrompt } from '../../../context/PromptContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { FileItem } from '../types';

export function useFileOperations(
  apiCall: any,
  currentPath: string,
  loadDirectory: any,
  invalidateCache: any
) {
  const { showToast } = useToast();
  const { prompt } = usePrompt();
  const { confirm } = useConfirm();

  const handleCreateFolder = useCallback(async () => {
    const name = (await prompt('Folder name:'))?.trim();
    if (!name) return;
    try {
      await apiCall('mkdir', { dirPath: `${currentPath}/${name}` });
      invalidateCache(currentPath);
      loadDirectory(currentPath);
    } catch (err: any) {
      showToast(err.message || 'Failed to create folder');
    }
  }, [apiCall, currentPath, loadDirectory, prompt, showToast, invalidateCache]);

  const handleCreateFile = useCallback(async () => {
    const name = (await prompt('File name:'))?.trim();
    if (!name) return;
    try {
      await apiCall('write', { filePath: `${currentPath}/${name}`, content: '' });
      invalidateCache(currentPath);
      loadDirectory(currentPath);
    } catch (err: any) {
      showToast(err.message || 'Failed to create file');
    }
  }, [apiCall, currentPath, loadDirectory, prompt, showToast, invalidateCache]);

  const handleRename = useCallback(async (item: FileItem) => {
    const newName = (await prompt('Rename to:', item.name))?.trim();
    if (!newName || newName === item.name) return;
    try {
      await apiCall('move', { sourcePath: item.path, destPath: `${currentPath}/${newName}` });
      invalidateCache(currentPath);
      loadDirectory(currentPath);
      showToast('Renamed successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to rename');
    }
  }, [apiCall, currentPath, loadDirectory, prompt, showToast, invalidateCache]);

  const handleCopy = useCallback(async (item: FileItem, destPath?: string) => {
    const finalDest = destPath || (await prompt('Copy to (new name):', `${item.name}_copy`))?.trim();
    if (!finalDest) return;
    try {
      await apiCall('copy', { 
        sourcePath: item.path, 
        destPath: destPath ? `${destPath}/${item.name}` : `${currentPath}/${finalDest}` 
      });
      invalidateCache(currentPath);
      if (destPath && destPath !== currentPath) invalidateCache(destPath);
      loadDirectory(currentPath);
      showToast('Copied successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to copy');
    }
  }, [apiCall, currentPath, loadDirectory, prompt, showToast, invalidateCache]);

  const handleMove = useCallback(async (item: FileItem, destPath: string) => {
    if (destPath && destPath !== item.path) {
      try {
        await apiCall('move', { sourcePath: item.path, destPath: `${destPath}/${item.name}` });
        invalidateCache(currentPath);
        invalidateCache(destPath);
        loadDirectory(currentPath);
        showToast('Moved successfully');
      } catch (err: any) {
        showToast(err.message || 'Failed to move');
      }
    }
  }, [apiCall, currentPath, loadDirectory, showToast, invalidateCache]);

  const handleDelete = useCallback(async (item: FileItem) => {
    if (await confirm(`Move ${item.name} to Trash?`)) {
      try {
        try { await apiCall('mkdir', { dirPath: '.trash' }); } catch (e) {}
        await apiCall('move', { sourcePath: item.path, destPath: `.trash/${item.name}` });
        invalidateCache(currentPath);
        invalidateCache('.trash');
        loadDirectory(currentPath);
        showToast('Moved to trash');
      } catch (err: any) {
        showToast(err.message || 'Failed to move to trash');
      }
    }
  }, [apiCall, currentPath, loadDirectory, confirm, showToast, invalidateCache]);

  const handleAddComment = useCallback(async (item: FileItem, text: string) => {
    if (!text.trim()) return;
    try {
      await apiCall('add-comment', { filePath: item.path, text });
      showToast('Comment added');
      loadDirectory(currentPath, false);
    } catch (err: any) {
      showToast(err.message || 'Failed to add comment');
    }
  }, [apiCall, currentPath, loadDirectory, showToast]);

  return {
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleCopy,
    handleMove,
    handleDelete,
    handleAddComment
  };
}
