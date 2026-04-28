 
import React from 'react';
import { Folder, AlertCircle, CheckCircle } from 'lucide-react';

export const EmptyState = ({ hasSearch, onClearSearch, onUpload }: { hasSearch?: boolean; onClearSearch?: () => void; onUpload?: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
    <div className="p-6 bg-[var(--bg-tertiary)] rounded-full mb-4 border border-[var(--border-color)] shadow-inner">
      <Folder size={48} className="opacity-40 text-blue-400" />
    </div>
    <span className="text-sm font-medium">{hasSearch ? 'No files found' : 'This folder is empty'}</span>
    <span className="text-xs opacity-70 mt-1">
      {hasSearch ? 'Try a different search term' : 'Upload files or create a new folder to get started'}
    </span>
    {hasSearch && onClearSearch && (
      <button onClick={onClearSearch} className="mt-4 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold transition-all border border-blue-500/20">
        Clear Search
      </button>
    )}
    {!hasSearch && onUpload && (
      <button onClick={onUpload} className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20">
        Upload File
      </button>
    )}
  </div>
);

export const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-8 gap-3">
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-full border-2 border-[var(--border-color)]"></div>
      <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
    </div>
    <span className="text-xs font-medium text-[var(--text-secondary)] animate-pulse">Loading...</span>
  </div>
);

export const ErrorMessage = ({ msg }: { msg: string }) => (
  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 shadow-sm mb-4">
    <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
    <div className="flex flex-col">
      <span className="text-sm font-bold">Error</span>
      <span className="text-xs mt-0.5 opacity-90">{msg}</span>
    </div>
  </div>
);

export const SuccessToast = ({ msg }: { msg: string }) => (
  <div className="fixed bottom-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
    <CheckCircle size={18} className="flex-shrink-0" />
    <span className="text-sm font-medium">{msg}</span>
  </div>
);
