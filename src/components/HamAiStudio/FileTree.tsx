 
import React, { useRef, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ProjectFile } from './types';
import JSZip from 'jszip';
import { 
  ChevronRight, 
  Folder, 
  File, 
  Plus, 
  Trash2, 
  FileCode, 
  FileJson, 
  FileType, 
  FileText, 
  Image as ImageIcon,
  Edit2,
  Copy,
  Download,
  Upload,
  ChevronsDown,
  ChevronsUp,
  X,
  CircleDot
} from 'lucide-react';
import { haptic } from '../../services/HapticFeedback';
import { FileTreeContextMenu } from './FileTreeContextMenu';
import { useFileTreeLogic } from './hooks/useFileTreeLogic';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useProjectStore } from '../../store/projectStore';

interface FileTreeProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onNewFile: (path: string, isFolder: boolean) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
  onMoveFile?: (sourcePath: string, targetPath: string) => void;
  onDuplicateFile?: (path: string) => void;
  onUploadFile?: (file: File) => void;
  onImportFiles?: (files: { path: string, content: string }[]) => void;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'java':
    case 'kt':
      return <FileCode size={14} className="text-blue-400" />;
    case 'json':
      return <FileJson size={14} className="text-yellow-400" />;
    case 'css':
    case 'scss':
    case 'xml':
      return <FileType size={14} className="text-pink-400" />;
    case 'html':
      return <FileCode size={14} className="text-orange-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
      return <ImageIcon size={14} className="text-emerald-400" />;
    case 'md':
      return <FileText size={14} className="text-gray-400" />;
    default:
      return <File size={14} className="text-gray-500" />;
  }
};

const FileTree: React.FC<FileTreeProps> = (props) => {
  const shadowBuffers = useProjectStore(state => state.shadowBuffers);
  const shadowBufferKeys = useProjectStore(state => Object.keys(state.shadowBuffers).join(','));
  const shadowBufferDeletes = useProjectStore(state => 
    Object.keys(state.shadowBuffers).filter(k => state.shadowBuffers[k] === '__DELETED__').join(',')
  );
  const { confirm } = useConfirm();
  
  const mergedProps = useMemo(() => {
    const mergedFiles = [...props.files];
    const existingPaths = new Set(mergedFiles.map(f => f.path));
    const keys = shadowBufferKeys ? shadowBufferKeys.split(',') : [];
    const deletes = new Set(shadowBufferDeletes ? shadowBufferDeletes.split(',') : []);
    
    keys.forEach(path => {
      if (!existingPaths.has(path) && !deletes.has(path)) {
        mergedFiles.push({ path, content: '' }); // Content not needed for tree rendering
      }
    });
    const finalFiles = mergedFiles.filter(f => !deletes.has(f.path));
    return { ...props, files: finalFiles };
  }, [props, shadowBufferKeys, shadowBufferDeletes]);

  const {
    newFilePath, setNewFilePath,
    showNewFileInput, setShowNewFileInput,
    dragOverItem, setDragOverItem,
    contextMenu, setContextMenu,
    renamingPath, setRenamingPath,
    renameValue, setRenameValue,
    searchQuery, setSearchQuery,
    fileInputRef,
    isLongPress,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    toggleFolder,
    handleFileUpload,
    handleCollapseAll,
    handleExpandAll,
    handleCreateFile,
    handleContextMenu,
    handleRenameSubmit,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    flatEntries
  } = useFileTreeLogic(mergedProps);

  const { files, selectedFile, onSelectFile, onDeleteFile, onDuplicateFile, onUploadFile, onImportFiles } = mergedProps;
  const zipInputRef = useRef<HTMLInputElement>(null);
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
          const ext = relativePath.split('.').pop()?.toLowerCase();
          const isBinary = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg', 'woff', 'woff2', 'ttf', 'eot'].includes(ext || '');
          
          let content: string;
          if (isBinary) {
              const blob = await zipEntry.async('blob');
              content = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
              });
          } else {
              content = await zipEntry.async('string');
          }
          
          importedFiles.push({ path: relativePath, content });
        }
      }

      onImportFiles(importedFiles);
      showToast('Project imported successfully', 'success');
    } catch (error) {
      console.error("Failed to unzip file:", error);
      showToast("Failed to unzip file. Please ensure it is a valid ZIP archive.", 'error');
    }
    
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  const handleDownloadFolder = async (folderPath: string) => {
    const zip = new JSZip();
    const folderFiles = files.filter(f => f.path.startsWith(folderPath + '/'));
    
    if (folderFiles.length === 0) {
        showToast('Folder is empty', 'warning');
        setContextMenu(null);
        return;
    }

    folderFiles.forEach(file => {
        // relative path inside the zip
        const relativePath = file.path.substring(folderPath.length + 1);
        zip.file(relativePath, file.content);
    });

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderPath.split('/').pop()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Folder downloaded', 'success');
    } catch (e) {
        console.error(e);
        showToast('Failed to download folder', 'error');
    }
    setContextMenu(null);
  };

  const renderRow = (index: number, entry: any) => {
    const isRenaming = renamingPath === entry.path;

    if (isRenaming) {
       return (
         <div 
           key={entry.id}
           style={{ paddingLeft: `${entry.depth * 10 + (entry.type === 'folder' ? 4 : 20)}px` }}
           className="flex items-center p-1 rounded-md bg-[var(--bg-tertiary)] border border-blue-500/50 h-7"
         >
            {entry.type === 'folder' ? <Folder size={12} className="mr-1.5 text-blue-500" /> : <div className="mr-1.5">{getFileIcon(entry.name)}</div>}
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              onBlur={handleRenameSubmit}
              autoFocus
              className="bg-transparent text-[11px] text-[var(--text-primary)] outline-none w-full font-mono"
            />
         </div>
       );
    }

    if (entry.type === 'folder') {
      const isDragOver = dragOverItem === entry.path;
      return (
        <div 
          key={entry.id}
          style={{ paddingLeft: `${entry.depth * 10 + 4}px` }}
          onClick={() => toggleFolder(entry.path)}
          onContextMenu={(e) => handleContextMenu(e, entry.path, 'folder')}
          onTouchStart={(e) => handleTouchStart(e, entry.path, 'folder')}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          draggable
          onDragStart={(e) => handleDragStart(e, entry.path)}
          onDragOver={(e) => handleDragOver(e, entry.path, 'folder')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, entry.path, 'folder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFolder(entry.path);
            } else if (e.key === 'ArrowRight' && !entry.isExpanded) {
                e.preventDefault();
                toggleFolder(entry.path);
            } else if (e.key === 'ArrowLeft' && entry.isExpanded) {
                e.preventDefault();
                toggleFolder(entry.path);
            }
          }}
          className={`flex items-center p-1 rounded-md cursor-pointer hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] group transition-colors text-xs select-none h-7 ${isDragOver ? 'bg-blue-500/20 border border-blue-500/50' : ''}`}
          role="treeitem"
          aria-expanded={entry.isExpanded}
          aria-selected={false}
          tabIndex={0}
          aria-label={`Folder ${entry.name}`}
        >
          <ChevronRight size={12} className={`mr-1 transition-transform duration-200 ${entry.isExpanded ? 'rotate-90' : ''}`} />
          <Folder size={12} className={`mr-1.5 transition-colors ${entry.isExpanded ? 'text-blue-400 fill-blue-400/10' : 'text-blue-500/60'}`} />
          <span className="truncate font-medium group-hover:text-[var(--text-primary)] flex-1">{entry.name}</span>
          <button 
            onClick={async (e) => { e.stopPropagation(); if(await confirm(`Delete ${entry.path}?`)) onDeleteFile(entry.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity"
            title="Delete"
          >
            <Trash2 size={10} />
          </button>
        </div>
      );
    } else {
      const isSelected = selectedFile?.path === entry.path;
      const isDragOver = dragOverItem === entry.path.substring(0, entry.path.lastIndexOf('/'));
      const hasShadowBuffer = !!shadowBuffers[entry.path];
      
      return (
        <div 
          key={entry.id}
          style={{ paddingLeft: `${entry.depth * 10 + 20}px` }}
          onClick={() => {
            if (!isLongPress.current) {
                onSelectFile(files.find(f => f.path === entry.path)!);
                haptic.selection();
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, entry.path, 'file')}
          onTouchStart={(e) => handleTouchStart(e, entry.path, 'file')}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          draggable
          onDragStart={(e) => handleDragStart(e, entry.path)}
          onDragOver={(e) => handleDragOver(e, entry.path, 'file')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, entry.path, 'file')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isLongPress.current) {
                    onSelectFile(files.find(f => f.path === entry.path)!);
                    haptic.selection();
                }
            }
          }}
          className={`flex items-center justify-between p-1 rounded-md cursor-pointer transition-all group text-xs select-none h-7 ${isSelected ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'} ${isDragOver && !isSelected ? 'border-b-2 border-blue-500' : ''} ${hasShadowBuffer ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : ''}`}
          role="treeitem"
          aria-selected={isSelected}
          tabIndex={isSelected ? 0 : -1}
          aria-label={`File ${entry.name}`}
        >
          <div className="flex items-center truncate flex-1">
              <div className="mr-1.5 shrink-0">{getFileIcon(entry.name)}</div>
              <span className={`truncate text-[11px] ${isSelected ? 'font-bold' : 'font-medium'} ${hasShadowBuffer ? 'text-blue-300' : ''}`}>{entry.name}</span>
              {hasShadowBuffer && <CircleDot size={8} className="ml-2 text-blue-400 animate-pulse" />}
          </div>
          <button 
            onClick={async (e) => { e.stopPropagation(); if(await confirm(`Delete ${entry.path}?`)) onDeleteFile(entry.path); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity shrink-0"
            title="Delete"
          >
            <Trash2 size={10} />
          </button>
        </div>
      );
    }
  };

  return (
    <div 
      className="flex flex-col h-full overflow-hidden relative"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setDragOverItem(''); // Root level
      }}
      onDrop={(e) => handleDrop(e, '', 'folder')}
      onDragLeave={handleDragLeave}
      role="tree"
      aria-label="Project File Explorer"
    >
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
        
        <div className="flex-1">
            <Virtuoso
              style={{ height: '100%' }}
              totalCount={flatEntries.length}
              itemContent={(index) => renderRow(index, flatEntries[index])}
              className="scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent"
            />
        </div>

        <FileTreeContextMenu
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          setNewFilePath={setNewFilePath}
          setShowNewFileInput={setShowNewFileInput}
          setRenamingPath={setRenamingPath}
          setRenameValue={setRenameValue}
          onDuplicateFile={onDuplicateFile}
          onDeleteFile={onDeleteFile}
          handleDownloadFolder={handleDownloadFolder}
          files={files}
        />
    </div>
  );
}; 

export default FileTree;
