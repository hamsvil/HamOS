 
import React from 'react';

export interface FileContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  actions: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'danger' | 'default';
  }[];
}

export const FileContextMenu = ({ x, y, onClose, actions }: FileContextMenuProps) => (
  <div 
    className="fixed bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] p-1.5 rounded-xl shadow-2xl z-[100] min-w-[160px] backdrop-blur-md" 
    style={{ top: y, left: x }}
    onClick={e => e.stopPropagation()}
  >
    <div className="flex flex-col gap-0.5">
      {actions.map((a, i) => (
        <button 
          key={i} 
          onClick={() => { a.onClick(); onClose(); }} 
          className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors w-full text-left ${
            a.variant === 'danger' 
              ? 'text-red-400 hover:bg-red-500/10' 
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <span className="opacity-70">{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  </div>
);
