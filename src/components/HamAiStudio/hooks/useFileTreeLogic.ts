 
import { useState, useRef, useEffect, useMemo } from 'react';
import { ProjectFile } from '../types';
import { haptic } from '../../../services/HapticFeedback';

interface UseFileTreeLogicProps {
  files: ProjectFile[];
  onSelectFile: (file: ProjectFile) => void;
  onNewFile: (path: string, isFolder: boolean) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
  onMoveFile?: (sourcePath: string, targetPath: string) => void;
  onDuplicateFile?: (path: string) => void;
  onUploadFile?: (file: File) => void;
}

export function useFileTreeLogic({
  files,
  onSelectFile,
  onNewFile,
  onDeleteFile,
  onRenameFile,
  onMoveFile,
  onDuplicateFile,
  onUploadFile
}: UseFileTreeLogicProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'public']));
  const [newFilePath, setNewFilePath] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState<'file' | 'folder' | null>(null);
  
  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; type: 'file' | 'folder' } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Long Press Logic
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTouchStart = (e: React.TouchEvent, path: string, type: 'file' | 'folder') => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      haptic.impact('medium');
      setContextMenu({ x: e.touches[0].clientX, y: e.touches[0].clientY, path, type });
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCollapseAll = () => {
    setExpandedFolders(new Set());
  };

  const handleExpandAll = () => {
    const allFolders = new Set<string>();
    files.forEach(file => {
      const parts = file.path.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (i === 0 ? '' : '/') + parts[i];
        allFolders.add(currentPath);
      }
    });
    setExpandedFolders(allFolders);
  };

  const handleCreateFile = (isFolder: boolean) => {
    if (newFilePath.trim()) {
        onNewFile(newFilePath, isFolder);
        setNewFilePath('');
        setShowNewFileInput(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, type: 'file' | 'folder') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path, type });
  };

  const handleRenameSubmit = () => {
    if (renamingPath && renameValue.trim() && renameValue !== renamingPath && onRenameFile) {
      onRenameFile(renamingPath, renameValue);
    }
    setRenamingPath(null);
    setRenameValue('');
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.stopPropagation();
    setDraggedItem(path);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', path);
  };

  const handleDragOver = (e: React.DragEvent, path: string, type: 'file' | 'folder') => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Only allow dropping into folders or at the root
    if (type === 'folder') {
      setDragOverItem(path);
    } else {
      // If dragging over a file, set the drop target to its parent folder
      const parts = path.split('/');
      parts.pop();
      setDragOverItem(parts.join('/'));
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetPath: string, type: 'file' | 'folder') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);

    if (!draggedItem || !onMoveFile) return;

    let destinationFolder = targetPath;
    if (type === 'file') {
      const parts = targetPath.split('/');
      parts.pop();
      destinationFolder = parts.join('/');
    }

    // Prevent dropping a folder into itself or its children
    if (destinationFolder === draggedItem || destinationFolder.startsWith(draggedItem + '/')) return;
    
    // Prevent dropping into the same folder it's already in
    const draggedParts = draggedItem.split('/');
    const draggedName = draggedParts.pop();
    const draggedParent = draggedParts.join('/');
    
    if (destinationFolder === draggedParent) return;

    const newPath = destinationFolder ? `${destinationFolder}/${draggedName}` : draggedName;
    
    if (newPath) {
      // Check for duplicate name
      let finalPath = newPath;
      let counter = 1;
      const fileExists = (path: string) => files.some(f => f.path === path);
      
      while (fileExists(finalPath)) {
        const nameParts = draggedName?.split('.') || [];
        if (nameParts.length > 1) {
            const ext = nameParts.pop();
            const name = nameParts.join('.');
            finalPath = destinationFolder ? `${destinationFolder}/${name}_copy${counter}.${ext}` : `${name}_copy${counter}.${ext}`;
        } else {
            finalPath = destinationFolder ? `${destinationFolder}/${draggedName}_copy${counter}` : `${draggedName}_copy${counter}`;
        }
        counter++;
      }

      onMoveFile(draggedItem, finalPath);
    }
    setDraggedItem(null);
  };

  const fuzzyMatch = (pattern: string, str: string) => {
    let patternIdx = 0;
    let strIdx = 0;
    let patternLength = pattern.length;
    let strLength = str.length;
  
    while (patternIdx !== patternLength && strIdx !== strLength) {
      if (pattern.charAt(patternIdx).toLowerCase() === str.charAt(strIdx).toLowerCase()) {
        ++patternIdx;
      }
      ++strIdx;
    }
  
    return patternLength !== 0 && strLength !== 0 && patternIdx === patternLength;
  };

  const flatEntries = useMemo(() => {
    const entries: {
      id: string;
      name: string;
      type: 'file' | 'folder';
      path: string;
      depth: number;
      isExpanded: boolean;
    }[] = [];
    
    const buildFlatTree = (pathPrefix = '', depth = 0) => {
      const currentEntries = new Map<string, 'file' | 'folder'>();

      files.forEach(file => {
        // Filter by search query
        if (searchQuery && !file.path.toLowerCase().includes(searchQuery.toLowerCase()) && !fuzzyMatch(searchQuery, file.path)) {
          return;
        }

        if (file.path.startsWith(pathPrefix)) {
          const relativePath = file.path.substring(pathPrefix.length);
          const parts = relativePath.split('/');
          const entryName = parts[0];

          if (parts.length > 1) {
            // If searching, we flatten the structure or show folders that contain matches
            // For simplicity, if searching, we only show files that match
            if (!searchQuery) {
              currentEntries.set(entryName, 'folder');
            }
          } else if (entryName) {
            currentEntries.set(entryName, 'file');
          }
        }
      });

      const sorted = Array.from(currentEntries.entries()).sort((a, b) => {
        if (a[1] === b[1]) return a[0].localeCompare(b[0]);
        return a[1] === 'folder' ? -1 : 1;
      });

      sorted.forEach(([name, type]) => {
        const fullPath = pathPrefix + name;
        // Always expand if searching
        const isExpanded = searchQuery ? true : expandedFolders.has(fullPath);
        
        entries.push({
          id: fullPath,
          name,
          type,
          path: fullPath,
          depth,
          isExpanded
        });

        if (type === 'folder' && isExpanded) {
          buildFlatTree(fullPath + '/', depth + 1);
        }
      });
    };

    buildFlatTree();
    return entries;
  }, [files, expandedFolders, searchQuery]);

  return {
    expandedFolders,
    newFilePath, setNewFilePath,
    showNewFileInput, setShowNewFileInput,
    draggedItem,
    dragOverItem, setDragOverItem,
    contextMenu, setContextMenu,
    renamingPath, setRenamingPath,
    renameValue, setRenameValue,
    searchQuery, setSearchQuery,
    fileInputRef,
    isLongPress,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    toggleFolder,
    handleFileUpload,
    handleCollapseAll,
    handleExpandAll,
    handleCreateFile,
    handleContextMenu,
    handleRenameSubmit,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    flatEntries
  };
}
