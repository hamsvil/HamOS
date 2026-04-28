 
import React from 'react';
import { Plus, Folder, Edit2, Copy, Download, Trash2 } from 'lucide-react';
import { ProjectFile } from './types';
import { haptic } from '../../services/HapticFeedback';
import { useConfirm } from '../../context/ConfirmContext';

interface FileTreeContextMenuProps {
  contextMenu: { x: number; y: number; path: string; type: 'file' | 'folder' } | null;
  setContextMenu: (menu: { x: number; y: number; path: string; type: 'file' | 'folder' } | null) => void;
  setNewFilePath: (path: string) => void;
  setShowNewFileInput: (show: 'file' | 'folder' | null) => void;
  setRenamingPath: (path: string | null) => void;
  setRenameValue: (value: string) => void;
  onDuplicateFile?: (path: string) => void;
  onDeleteFile: (path: string) => void;
  handleDownloadFolder: (path: string) => void;
  files: ProjectFile[];
}

export const FileTreeContextMenu: React.FC<FileTreeContextMenuProps> = ({
  contextMenu,
  setContextMenu,
  setNewFilePath,
  setShowNewFileInput,
  setRenamingPath,
  setRenameValue,
  onDuplicateFile,
  onDeleteFile,
  handleDownloadFolder,
  files
}) => {
  const { confirm } = useConfirm();
  if (!contextMenu) return null;

  return (
    <>
      <div 
        className="fixed bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl z-50 py-1 min-w-[150px]"
        style={{ 
            top: Math.min(contextMenu.y, window.innerHeight - 250), 
            left: Math.min(contextMenu.x, window.innerWidth - 160) 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-white/10 mb-1">
          <p className="text-xs font-medium text-white truncate">{contextMenu.path.split('/').pop()}</p>
        </div>
        
        {contextMenu.type === 'folder' && (
            <>
                <button 
                  className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                  onClick={() => {
                    setNewFilePath(contextMenu.path + '/');
                    setShowNewFileInput('file');
                    setContextMenu(null);
                  }}
                >
                  <Plus size={12} /> New File
                </button>
                <button 
                  className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                  onClick={() => {
                    setNewFilePath(contextMenu.path + '/');
                    setShowNewFileInput('folder');
                    setContextMenu(null);
                  }}
                >
                  <Folder size={12} /> New Folder
                </button>
                <div className="h-px bg-white/10 my-1" />
            </>
        )}

        <button 
          className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
          onClick={() => {
            setRenamingPath(contextMenu.path);
            setRenameValue(contextMenu.path.split('/').pop() || '');
            setContextMenu(null);
          }}
        >
          <Edit2 size={12} /> Rename
        </button>
        <button 
          className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
          onClick={() => {
            navigator.clipboard.writeText(contextMenu.path);
            haptic.selection();
            setContextMenu(null);
          }}
        >
          <Copy size={12} /> Copy Path
        </button>
        {contextMenu.type === 'file' && onDuplicateFile && (
          <button 
            className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
            onClick={() => {
              onDuplicateFile(contextMenu.path);
              setContextMenu(null);
            }}
          >
            <Plus size={12} /> Duplicate
          </button>
        )}
        {contextMenu.type === 'file' && (
          <button 
            className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
            onClick={() => {
              const file = files.find(f => f.path === contextMenu.path);
              if (file) {
                const blob = new Blob([file.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = contextMenu.path.split('/').pop() || 'file.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
              setContextMenu(null);
            }}
          >
            <Download size={12} /> Download
          </button>
        )}
        {contextMenu.type === 'folder' && (
          <button 
            className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
            onClick={() => handleDownloadFolder(contextMenu.path)}
          >
            <Download size={12} /> Download Folder
          </button>
        )}
        <div className="h-px bg-white/10 my-1" />
        <button 
          className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/20 flex items-center gap-2"
          onClick={async () => {
            if (await confirm(`Delete ${contextMenu.path}?`)) {
              onDeleteFile(contextMenu.path);
            }
            setContextMenu(null);
          }}
        >
          <Trash2 size={12} /> Delete
        </button>
        <div className="h-px bg-white/10 my-1" />
        <button 
            onClick={() => setContextMenu(null)}
            className="w-full text-left px-4 py-2 text-xs text-white/50 hover:bg-white/10"
        >
            Cancel
        </button>
      </div>
      
      {/* Overlay to close context menu */}
      <div 
          className="fixed inset-0 z-[40]" 
          onClick={() => setContextMenu(null)}
          onTouchStart={() => setContextMenu(null)}
      />
    </>
  );
};
