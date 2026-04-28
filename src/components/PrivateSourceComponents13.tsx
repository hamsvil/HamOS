 
import React from 'react';
import { X } from 'lucide-react';
import { FilePreviewModalProps } from './PrivateSourceComponents13.types';

export const FilePreviewModal = ({ isOpen, onClose, content, title }: FilePreviewModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-[var(--border-color)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-medium text-[var(--text-primary)] truncate">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-auto flex-1 font-mono text-sm text-[var(--text-primary)] whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
};
