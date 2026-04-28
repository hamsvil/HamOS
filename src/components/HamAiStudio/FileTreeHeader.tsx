import React, { RefObject } from 'react';
import { ChevronsDown, ChevronsUp, Plus, Folder, Upload, X } from 'lucide-react';

interface FileTreeHeaderProps {
  handleExpandAll: () => void;
  handleCollapseAll: () => void;
  setShowNewFileInput: (show: 'file' | 'folder' | null) => void;
  onImportFiles?: boolean;
  onUploadFile?: boolean;
  zipInputRef: RefObject<HTMLInputElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleZipUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showNewFileInput: 'file' | 'folder' | null;
  newFilePath: string;
  setNewFilePath: (path: string) => void;
  handleCreateFile: (isFolder: boolean) => void;
}

export const FileTreeHeader: React.FC<FileTreeHeaderProps> = ({
  handleExpandAll,
  handleCollapseAll,
  setShowNewFileInput,
  onImportFiles,
  onUploadFile,
  zipInputRef,
  fileInputRef,
  handleFileUpload,
  handleZipUpload,
  searchQuery,
  setSearchQuery,
  showNewFileInput,
  newFilePath,
  setNewFilePath,
  handleCreateFile
}) => {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest opacity-50">Explorer</span>
          <div className="flex items-center gap-1">
              <button 
                onClick={handleExpandAll} 
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Expand All"
              >
                <ChevronsDown size={14}/>
              </button>
              <button 
                onClick={handleCollapseAll} 
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Collapse All"
              >
                <ChevronsUp size={14}/>
              </button>
              <div className="w-px h-4 bg-[var(--border-color)] mx-1" />
              <button 
                onClick={() => setShowNewFileInput('file')} 
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="New File"
              >
                <Plus size={14}/>
              </button>
              <button 
                onClick={() => setShowNewFileInput('folder')} 
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="New Folder"
              >
                <Folder size={14}/>
              </button>
              {onImportFiles && (
                <button 
                  onClick={() => zipInputRef.current?.click()} 
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Import ZIP"
                >
                  <Upload size={14}/>
                </button>
              )}
              {onUploadFile && (
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Upload File"
                >
                  <Upload size={14}/>
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={zipInputRef} 
                onChange={handleZipUpload} 
                accept=".zip"
                className="hidden" 
              />
          </div>
      </div>
      
      {/* Search Input */}
      <div className="px-3 py-2 border-b border-[var(--border-color)] relative">
        <input 
          type="text" 
          placeholder="Search files..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs px-2 py-1.5 pr-7 rounded-md outline-none border border-transparent focus:border-blue-500/50 transition-all placeholder:text-[var(--text-secondary)]"
        />
        {searchQuery && (
          <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
              <X size={12} />
          </button>
        )}
      </div>
      
      {showNewFileInput && (
          <div className="px-3 py-2">
              <div className="relative">
                  <input 
                      type="text"
                      value={newFilePath}
                      onChange={(e) => setNewFilePath(e.target.value)}
                      placeholder={showNewFileInput === 'file' ? 'filename.js' : 'folder_name'}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFile(showNewFileInput === 'folder')}
                      onBlur={() => { if (!newFilePath) setShowNewFileInput(null); }}
                      className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs p-2 rounded-lg outline-none border border-[var(--border-color)] focus:border-blue-500 transition-all font-mono"
                      autoFocus
                  />
              </div>
          </div>
      )}
    </>
  );
};
