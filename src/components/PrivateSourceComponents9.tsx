 
import React from 'react';
import { Trash2, FileArchive, ArchiveRestore, Download, Edit2, Share2, Move, Copy, Info } from 'lucide-react';

export const FileContextMenu = ({ x, y, onClose, onAction }: { x: number; y: number; onClose: () => void; onAction: (action: string) => void }) => (
  <div 
    className="fixed bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1 w-48"
    style={{ top: y, left: x }}
    onClick={(e) => e.stopPropagation()}
  >
    {[
      { label: 'Download', icon: Download, action: 'download' },
      { label: 'Rename', icon: Edit2, action: 'rename' },
      { label: 'Move', icon: Move, action: 'move' },
      { label: 'Copy', icon: Copy, action: 'copy' },
      { label: 'Zip', icon: FileArchive, action: 'zip' },
      { label: 'Extract', icon: ArchiveRestore, action: 'extract' },
      { label: 'Share', icon: Share2, action: 'share' },
      { label: 'Properties', icon: Info, action: 'info' },
      { label: 'Delete', icon: Trash2, action: 'delete' },
    ].map((item) => (
      <button
        key={item.action}
        onClick={() => { onAction(item.action); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm transition-colors"
      >
        <item.icon size={16} />
        {item.label}
      </button>
    ))}
  </div>
);
