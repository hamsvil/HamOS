 
import { useState, useCallback } from 'react';
import { FileItem } from '../types';

export function useFileSelection(items: FileItem[]) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((path: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedItems(prev => {
      if (prev.size === items.length && items.length > 0) return new Set();
      return new Set(items.map(i => i.path));
    });
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  return {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    toggleSelectAll,
    clearSelection
  };
}
