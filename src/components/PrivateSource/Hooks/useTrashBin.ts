 
import { useState, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

export function useTrashBin(apiCall: any, loadDirectory: any, currentPath: string) {
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const loadTrash = useCallback(async () => {
    try {
      const data = await apiCall('list', { dirPath: '.trash' });
      setTrashItems((data.items || []).map((item: any) => {
        // Parse original name from timestamp-name format
        const match = item.name.match(/^\d+-(.+)$/);
        const originalName = match ? match[1] : item.name;
        return {
          id: item.path,
          name: item.name,
          originalName,
          originalPath: item.metadata?.originalPath || null,
          size: item.size,
          modifiedAt: item.modifiedAt
        };
      }));
    } catch (err) {
      setTrashItems([]);
    }
  }, [apiCall]);

  const handleRestore = useCallback(async (item: any) => {
    try {
      const destPath = `${currentPath}/${item.originalName}`;
      await apiCall('restore', { trashPath: item.id, originalName: destPath });
      loadTrash();
      loadDirectory(currentPath);
      showToast('Restored successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to restore');
    }
  }, [apiCall, currentPath, loadDirectory, loadTrash, showToast]);

  const handleDeletePermanently = useCallback(async (id: string) => {
    if (await confirm('Delete this file permanently?')) {
      try {
        await apiCall('delete', { targetPath: id });
        loadTrash();
        showToast('Deleted permanently');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete');
      }
    }
  }, [apiCall, confirm, loadTrash, showToast]);

  const handleEmptyTrash = useCallback(async () => {
    if (await confirm('Empty all items in trash? This cannot be undone.')) {
      try {
        await apiCall('empty-trash', {});
        loadTrash();
        showToast('Trash emptied');
      } catch (err: any) {
        showToast(err.message || 'Failed to empty trash');
      }
    }
  }, [apiCall, confirm, loadTrash, showToast]);

  return {
    trashItems,
    loadTrash,
    handleRestore,
    handleDeletePermanently,
    handleEmptyTrash
  };
}
