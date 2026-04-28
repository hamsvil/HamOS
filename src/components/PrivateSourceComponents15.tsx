 
import React from 'react';
import { X, Info } from 'lucide-react';
import { FilePermissionBadge, FileAccessTime, FileChangeTime, FileMimeType } from './PrivateSourceComponents3';
import { 
  FileOwnerAvatar, 
} from './PrivateSourceComponents16';
import { FileInfoModalProps } from './PrivateSourceComponents15.types';

export const FileInfoModal = ({ isOpen, onClose, item }: FileInfoModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-lg border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/30 shrink-0">
          <h3 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
            <Info size={18} className="text-blue-400" />
            File Properties
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
            <X size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Name</label>
                <p className="font-medium break-all text-[var(--text-primary)]">{item.name}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Path</label>
                <p className="text-[var(--text-secondary)] break-all font-mono text-xs">{item.path}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Size</label>
                  <p className="text-[var(--text-primary)]">{(item.size / 1024).toFixed(2)} KB</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Type</label>
                  <div className="flex"><FileMimeType m={item.isDirectory ? 'directory' : 'file'} /></div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Owner</label>
                <FileOwnerAvatar name="Me" imageUrl="" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Permissions</label>
                <div className="flex gap-2"><FilePermissionBadge p="rwx" /><FilePermissionBadge p="r-x" /><FilePermissionBadge p="r-x" /></div>
              </div>
              <div className="space-y-2 pt-2">
                <FileAccessTime t={item.modifiedAt} />
                <FileChangeTime t={item.modifiedAt} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-tertiary)]/30 border-t border-[var(--border-color)] flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-medium transition-colors shadow-lg shadow-blue-500/20">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
