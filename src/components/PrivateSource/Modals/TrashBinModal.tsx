 
import React from 'react';
import { Trash2, RotateCcw, Trash, File, X } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';

export interface FileTrashBinProps {
  items: any[];
  onRestore: (item: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onEmpty: () => void;
}

export const FileTrashBin = ({ items, onRestore, onDelete, onClose, onEmpty }: FileTrashBinProps) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
            <Trash2 size={20} className="text-red-400" />
          </div>
          <h3 className="font-medium text-[var(--text-primary)]">Trash Bin</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
          <X size={20} className="text-[var(--text-secondary)]" />
        </button>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={onEmpty}
          disabled={items.length === 0}
          className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider transition-colors px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Empty Trash
        </button>
      </div>

      <div className="h-[400px] w-full">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-full mb-3 border border-[var(--border-color)] shadow-inner">
              <Trash2 size={32} className="opacity-30 text-red-400" />
            </div>
            <span className="text-xs font-medium">Trash is empty</span>
          </div>
        ) : (
          <Virtuoso
            style={{ height: '100%', width: '100%' }}
            data={items}
            className="custom-scrollbar pr-1"
            itemContent={(index, item) => (
              <div className="flex items-center justify-between p-3 mb-2 rounded-xl bg-red-500/5 border border-red-500/10 group hover:bg-red-500/10 transition-colors shadow-sm">
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <File size={16} className="text-red-400/70 flex-shrink-0" />
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{item.originalName}</span>
                  </div>
                  {item.originalPath && (
                    <span className="text-[10px] text-[var(--text-secondary)] opacity-50 truncate ml-7">
                      From: {item.originalPath}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onRestore(item)} className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors shadow-sm" title="Restore"><RotateCcw size={14} /></button>
                  <button onClick={() => onDelete(item.id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shadow-sm" title="Delete Permanently"><Trash size={14} /></button>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  </div>
);
