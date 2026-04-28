 
import React from 'react';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { FilePathBreadcrumbProps, FileStatusIndicatorProps } from './PrivateSourceComponents7.types';

export const FilePathBreadcrumb = ({ path, onCopy }: FilePathBreadcrumbProps) => (
  <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
    <span className="font-mono text-sm text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-md">/{path}</span>
    <button 
      onClick={(e) => { e.stopPropagation(); onCopy(path); }} 
      className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-blue-400 transition-colors"
      title="Copy Path"
    >
      <Copy size={14} />
    </button>
  </div>
);

export const FileStatusIndicator = ({ status }: FileStatusIndicatorProps) => {
  if (status === 'synced') return <CheckCircle2 size={12} className="text-emerald-500" />;
  if (status === 'error') return <AlertCircle size={12} className="text-red-500" />;
  return <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />;
};
