 
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, FolderOpen, File, FileCode, FileJson, FileText, 
  ChevronRight, ChevronDown, Plus, Trash2, Edit2, MoreVertical, Upload
} from 'lucide-react';
import { FileData } from './types';
import JSZip from 'jszip';
import { useToast } from '../../context/ToastContext';

interface FileExplorerProps {
  files: FileData[];
  onFileClick: (file: FileData) => void;
  onFileDelete: (file: FileData) => void;
  onFileRename: (file: FileData, newName: string) => void;
  onCreateFile: (parentId: string | null, type: 'file' | 'folder') => void;
  onImportFiles?: (files: { path: string, content: string }[]) => void;
}

const FileIcon = ({ name, type }: { name: string; type: 'file' | 'folder' }) => {
  if (type === 'folder') return <Folder className="text-blue-400" size={16} />;
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode className="text-blue-500" size={16} />;
  if (name.endsWith('.css')) return <FileCode className="text-blue-300" size={16} />;
  if (name.endsWith('.json')) return <FileJson className="text-yellow-400" size={16} />;
  if (name.endsWith('.md')) return <FileText className="text-gray-400" size={16} />;
  return <File className="text-gray-500" size={16} />;
};

const FileItem = ({ file, depth, onFileClick, onFileDelete, onFileRename, onCreateFile }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(file.name);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onFileClick(file);
    }
  };

  const handleRename = () => {
    if (newName.trim() !== file.name) {
      onFileRename(file, newName);
    }
    setIsEditing(false);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1 hover:bg-[var(--bg-secondary)] cursor-pointer group text-sm ${
          file.isOpen ? 'bg-[var(--bg-tertiary)] text-blue-400' : 'text-[var(--text-secondary)]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleToggle}
      >
        <span className="opacity-50 hover:opacity-100 transition-opacity">
          {file.type === 'folder' && (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        
        <FileIcon name={file.name} type={file.type} />
        
        {isEditing ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className="bg-[var(--bg-primary)] border border-blue-500 text-xs px-1 rounded outline-none w-full"
            autoFocus
          />
        ) : (
          <span className="truncate flex-1">{file.name}</span>
        )}

        <div className="hidden group-hover:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {file.type === 'folder' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onCreateFile(file.id, 'file'); }} title="New File">
                <Plus size={12} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onCreateFile(file.id, 'folder'); }} title="New Folder">
                <FolderOpen size={12} />
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} title="Rename">
            <Edit2 size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onFileDelete(file); }} title="Delete" className="text-red-400 hover:text-red-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && file.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {file.children.map((child: FileData) => (
              <FileItem
                key={child.id}
                file={child}
                depth={depth + 1}
                onFileClick={onFileClick}
                onFileDelete={onFileDelete}
                onFileRename={onFileRename}
                onCreateFile={onCreateFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FileExplorer({ files, onFileClick, onFileDelete, onFileRename, onCreateFile, onImportFiles }: FileExplorerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportFiles) return;

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const importedFiles: { path: string, content: string }[] = [];

      for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('string');
          importedFiles.push({ path: relativePath, content });
        }
      }

      onImportFiles(importedFiles);
    } catch (_error) {
      // console.error("Failed to unzip file:", error);
      showToast("Failed to unzip file. Please ensure it is a valid ZIP archive.", "error");
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] border-r border-[var(--border-color)] w-64 select-none">
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Explorer</span>
        <div className="flex gap-1">
          {onImportFiles && (
             <button onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Import ZIP">
               <Upload size={14} />
             </button>
          )}
          <button onClick={() => onCreateFile(null, 'file')} className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="New File">
            <Plus size={14} />
          </button>
          <button onClick={() => onCreateFile(null, 'folder')} className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="New Folder">
            <FolderOpen size={14} />
          </button>
        </div>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleZipUpload} 
        accept=".zip" 
        className="hidden" 
      />
      
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-[var(--border-color)]">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            depth={0}
            onFileClick={onFileClick}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
            onCreateFile={onCreateFile}
          />
        ))}
      </div>
    </div>
  );
}
