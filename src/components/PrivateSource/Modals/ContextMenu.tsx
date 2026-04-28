 
import React, { useEffect, useRef } from 'react';
import { Eye, Edit2, Copy, Move, Download, Trash2, Info, FileArchive } from 'lucide-react';
import { FileItem } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  item: FileItem | null;
  onClose: () => void;
  onPreview: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onCopy: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onInfo: (item: FileItem) => void;
  onZip: (item: FileItem) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x, y, item, onClose, onPreview, onRename, onCopy, onMove, onDownload, onDelete, onInfo, onZip
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!item) return null;

  // Adjust position to prevent overflow
  const menuWidth = 200;
  const menuHeight = 350;
  const adjustedX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : x;
  const adjustedY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : y;

  const handleAction = (action: (item: FileItem) => void) => {
    action(item);
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-[100] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl py-2 w-[200px] flex flex-col backdrop-blur-xl bg-opacity-95"
      style={{ top: adjustedY, left: adjustedX }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-4 py-2 border-b border-[var(--border-color)] mb-2">
        <span className="text-xs font-black text-[var(--text-primary)] truncate block" title={item.name}>{item.name}</span>
      </div>
      
      {!item.isDirectory && (
        <button onClick={() => handleAction(onPreview)} className="flex items-center gap-3 px-4 py-2 hover:bg-violet-500/10 text-sm text-[var(--text-secondary)] hover:text-violet-400 transition-colors text-left">
          <Eye size={16} /> Preview
        </button>
      )}
      <button onClick={() => handleAction(onRename)} className="flex items-center gap-3 px-4 py-2 hover:bg-violet-500/10 text-sm text-[var(--text-secondary)] hover:text-violet-400 transition-colors text-left">
        <Edit2 size={16} /> Rename
      </button>
      <button onClick={() => handleAction(onCopy)} className="flex items-center gap-3 px-4 py-2 hover:bg-violet-500/10 text-sm text-[var(--text-secondary)] hover:text-violet-400 transition-colors text-left">
        <Copy size={16} /> Copy
      </button>
      <button onClick={() => handleAction(onMove)} className="flex items-center gap-3 px-4 py-2 hover:bg-violet-500/10 text-sm text-[var(--text-secondary)] hover:text-violet-400 transition-colors text-left">
        <Move size={16} /> Move
      </button>
      <button onClick={() => handleAction(onZip)} className="flex items-center gap-3 px-4 py-2 hover:bg-emerald-500/10 text-sm text-[var(--text-secondary)] hover:text-emerald-400 transition-colors text-left">
        <FileArchive size={16} /> Zip / Compress
      </button>
      <button onClick={() => handleAction(onDownload)} className="flex items-center gap-3 px-4 py-2 hover:bg-emerald-500/10 text-sm text-[var(--text-secondary)] hover:text-emerald-400 transition-colors text-left">
        <Download size={16} /> Download
      </button>
      <div className="h-px bg-[var(--border-color)] my-1" />
      <button onClick={() => handleAction(onInfo)} className="flex items-center gap-3 px-4 py-2 hover:bg-blue-500/10 text-sm text-[var(--text-secondary)] hover:text-blue-400 transition-colors text-left">
        <Info size={16} /> Details
      </button>
      <button onClick={() => handleAction(onDelete)} className="flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-sm text-red-400 hover:text-red-300 transition-colors text-left">
        <Trash2 size={16} /> Move to Trash
      </button>
    </div>
  );
};
