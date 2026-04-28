 
import React from 'react';
import { ChevronRight, Folder, Trash2, File, FileCode, FileJson, FileType, FileText, Image as ImageIcon } from 'lucide-react';
import { ProjectFile } from './types';
import { haptic } from '../../services/HapticFeedback';
import { useConfirm } from '../../context/ConfirmContext';

export const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'java':
    case 'kt':
      return <FileCode size={14} className="text-blue-400" />;
    case 'json':
      return <FileJson size={14} className="text-yellow-400" />;
    case 'css':
    case 'scss':
    case 'xml':
      return <FileType size={14} className="text-pink-400" />;
    case 'html':
      return <FileCode size={14} className="text-orange-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
      return <ImageIcon size={14} className="text-emerald-400" />;
    case 'md':
      return <FileText size={14} className="text-gray-400" />;
    default:
      return <File size={14} className="text-gray-500" />;
  }
};

interface FileTreeRowProps {
  entry: any;
  renamingPath: string | null;
  renameValue: string;
  setRenameValue: (val: string) => void;
  handleRenameSubmit: () => void;
  dragOverItem: string;
  toggleFolder: (path: string) => void;
  handleContextMenu: (e: React.MouseEvent | React.TouchEvent, path: string, type: 'file' | 'folder') => void;
  handleTouchStart: (e: React.TouchEvent, path: string, type: 'file' | 'folder') => void;
  handleTouchEnd: () => void;
  handleTouchMove: () => void;
  handleDragStart: (e: React.DragEvent, path: string) => void;
  handleDragOver: (e: React.DragEvent, path: string, type: 'file' | 'folder') => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, path: string, type: 'file' | 'folder') => void;
  onDeleteFile: (path: string) => void;
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  files: ProjectFile[];
  isLongPress: React.MutableRefObject<boolean>;
}

export const FileTreeRow: React.FC<FileTreeRowProps> = ({
  entry,
  renamingPath,
  renameValue,
  setRenameValue,
  handleRenameSubmit,
  dragOverItem,
  toggleFolder,
  handleContextMenu,
  handleTouchStart,
  handleTouchEnd,
  handleTouchMove,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  onDeleteFile,
  selectedFile,
  onSelectFile,
  files,
  isLongPress
}) => {
  const { confirm } = useConfirm();
  const isRenaming = renamingPath === entry.path;

  if (isRenaming) {
     return (
       <div 
         key={entry.id}
         style={{ paddingLeft: `${entry.depth * 10 + (entry.type === 'folder' ? 4 : 20)}px` }}
         className="flex items-center p-1 rounded-md bg-[var(--bg-tertiary)] border border-blue-500/50 h-7"
       >
          {entry.type === 'folder' ? <Folder size={12} className="mr-1.5 text-blue-500" /> : <div className="mr-1.5">{getFileIcon(entry.name)}</div>}
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
            onBlur={handleRenameSubmit}
            autoFocus
            className="bg-transparent text-[11px] text-[var(--text-primary)] outline-none w-full font-mono"
          />
       </div>
     );
  }

  if (entry.type === 'folder') {
    const isDragOver = dragOverItem === entry.path;
    return (
      <div 
        key={entry.id}
        style={{ paddingLeft: `${entry.depth * 10 + 4}px` }}
        onClick={() => toggleFolder(entry.path)}
        onContextMenu={(e) => handleContextMenu(e, entry.path, 'folder')}
        onTouchStart={(e) => handleTouchStart(e, entry.path, 'folder')}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        draggable
        onDragStart={(e) => handleDragStart(e, entry.path)}
        onDragOver={(e) => handleDragOver(e, entry.path, 'folder')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, entry.path, 'folder')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleFolder(entry.path);
          } else if (e.key === 'ArrowRight' && !entry.isExpanded) {
              e.preventDefault();
              toggleFolder(entry.path);
          } else if (e.key === 'ArrowLeft' && entry.isExpanded) {
              e.preventDefault();
              toggleFolder(entry.path);
          }
        }}
        className={`flex items-center p-1 rounded-md cursor-pointer hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] group transition-colors text-xs select-none h-7 ${isDragOver ? 'bg-blue-500/20 border border-blue-500/50' : ''}`}
        role="treeitem"
        aria-expanded={entry.isExpanded}
        aria-selected={false}
        tabIndex={0}
        aria-label={`Folder ${entry.name}`}
      >
        <ChevronRight size={12} className={`mr-1 transition-transform duration-200 ${entry.isExpanded ? 'rotate-90' : ''}`} />
        <Folder size={12} className={`mr-1.5 transition-colors ${entry.isExpanded ? 'text-blue-400 fill-blue-400/10' : 'text-blue-500/60'}`} />
        <span className="truncate font-medium group-hover:text-[var(--text-primary)] flex-1">{entry.name}</span>
        <button 
          onClick={async (e) => { e.stopPropagation(); if(await confirm(`Delete ${entry.path}?`)) onDeleteFile(entry.path); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>
    );
  } else {
    const isSelected = selectedFile?.path === entry.path;
    const isDragOver = dragOverItem === entry.path.substring(0, entry.path.lastIndexOf('/'));
    return (
      <div 
        key={entry.id}
        style={{ paddingLeft: `${entry.depth * 10 + 20}px` }}
        onClick={() => {
          if (!isLongPress.current) {
              onSelectFile(files.find(f => f.path === entry.path)!);
              haptic.selection();
          }
        }}
        onContextMenu={(e) => handleContextMenu(e, entry.path, 'file')}
        onTouchStart={(e) => handleTouchStart(e, entry.path, 'file')}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        draggable
        onDragStart={(e) => handleDragStart(e, entry.path)}
        onDragOver={(e) => handleDragOver(e, entry.path, 'file')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, entry.path, 'file')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!isLongPress.current) {
                  onSelectFile(files.find(f => f.path === entry.path)!);
                  haptic.selection();
              }
          }
        }}
        className={`flex items-center justify-between p-1 rounded-md cursor-pointer transition-all group text-xs select-none h-7 ${isSelected ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'} ${isDragOver && !isSelected ? 'border-b-2 border-blue-500' : ''}`}
        role="treeitem"
        aria-selected={isSelected}
        tabIndex={isSelected ? 0 : -1}
        aria-label={`File ${entry.name}`}
      >
        <div className="flex items-center truncate flex-1">
            <div className="mr-1.5 shrink-0">{getFileIcon(entry.name)}</div>
            <span className={`truncate text-[11px] ${isSelected ? 'font-bold' : 'font-medium'}`}>{entry.name}</span>
        </div>
        <button 
          onClick={async (e) => { e.stopPropagation(); if(await confirm(`Delete ${entry.path}?`)) onDeleteFile(entry.path); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity shrink-0"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>
    );
  }
};
