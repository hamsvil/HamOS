 
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, RefreshCw, Folder, Plus, Trash2, Shield, Eye, Info, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Hooks
import { useFileAuth } from './PrivateSource/Hooks/useFileAuth';
import { useFileSystem } from './PrivateSource/Hooks/useFileSystem';
import { useFileSelection } from './PrivateSource/Hooks/useFileSelection';
import { useFileSearch } from './PrivateSource/Hooks/useFileSearch';
import { useTrashBin } from './PrivateSource/Hooks/useTrashBin';
import { useSupremeProtocol } from '../hooks/useSupremeProtocol';

import { AuthModal } from './PrivateSource/Modals/AuthModal';
import { SortControls, SortConfig } from './PrivateSource/Toolbar/SortControls';
import { FileSearchHistory } from './PrivateSource/Toolbar/SearchHistory';
import { FileGrid } from './PrivateSource/FileGrid/FileGrid';
import { SearchBar } from './PrivateSource/Toolbar/SearchBar';
import { BulkActionToolbar } from './PrivateSource/Toolbar/BulkActionToolbar';
import { RealtimePresence } from './PrivateSource/Toolbar/RealtimePresence';
import { FileSidebar } from './PrivateSource/Sidebar/FileSidebar';
import { UniversalHolographicPreviewer } from './PrivateSource/Modals/UniversalHolographicPreviewer';
import { QuantumDropzone } from './PrivateSource/Toolbar/QuantumDropzone';
import { FileTrashBin as TrashBinModal } from './PrivateSource/Modals/TrashBinModal';
import { ContextMenu } from './PrivateSource/Modals/ContextMenu';
import { DirectoryPickerModal } from './PrivateSource/Modals/DirectoryPickerModal';
import { LoadingSpinner, EmptyState, ErrorMessage } from './PrivateSource/Modals/StatusComponents';
import { useTaskStore } from '../store/taskStore';
import { Breadcrumb } from './PrivateSource/Toolbar/Breadcrumb';
import { FileStorageQuotaBadge as StorageUsage } from './PrivateSource/Toolbar/StorageUsage';
import { SyncService } from '../services/SyncService';
import { PrivateSourceAssistant } from './PrivateSource/PrivateSourceAssistant';

// Types
import { FileItem } from './PrivateSource/types';

// Contexts/Services
import { useToast } from '../context/ToastContext';
import { safeStorage } from '../utils/storage';
import { EnvironmentChecker } from '../services/environmentChecker';
import { NativeStorage } from '../plugins/NativeStorage';
import { resilienceEngine, ServiceStatus } from '../services/ResilienceEngine';
import { db } from '../services/db';
import { ErrorBoundary } from './HamAiStudio/ErrorBoundary';

export default function PrivateSourceTab() {
  useSupremeProtocol();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth Hook
  const { token, isAuthenticated, loading: authLoading, login } = useFileAuth();

  // File System Hook
  const { 
    items, currentPath, loading: fsLoading, error: fsError, quota,
    loadDirectory, invalidateCache, apiCall, handleCreateFolder, handleCreateFile,
    handleRename, handleCopy, handleMove, handleDelete, handleBulkDelete, handleBulkZip, handleBulkDownload, handleZip, handleUnzip,
    handleAddComment, handleBulkMove, handleBulkCopy
  } = useFileSystem(token, isAuthenticated);

  // Trash Bin Hook
  const {
    trashItems, loadTrash, handleRestore, handleDeletePermanently, handleEmptyTrash
  } = useTrashBin(apiCall, loadDirectory, currentPath);

  const { addTask, updateTask, removeTask } = useTaskStore();

  // Selection Hook
  const { selectedItems, toggleSelection, toggleSelectAll, clearSelection } = useFileSelection(items);

  const handleSyncAll = async () => {
    if (!EnvironmentChecker.isNativeAndroid()) {
      showToast('Sync only available on Android Native App', 'warning');
      return;
    }

    const taskId = await addTask({ name: 'Syncing all files to device', type: 'syncing' });
    await updateTask(taskId, { status: 'running', progress: 0 });

    try {
      const syncRecursive = async (path: string) => {
        const data = await apiCall('list', { dirPath: path });
        const files = data.items || [];
        
        for (const file of files) {
          if (file.isDirectory) {
            await SyncService.syncToDevice(file.path, undefined, true);
            await syncRecursive(file.path);
          } else {
            const contentData = await apiCall('read', { filePath: file.path });
            await SyncService.syncToDevice(file.path, contentData.content);
          }
        }
      };

      await syncRecursive('');
      await updateTask(taskId, { status: 'completed', progress: 100 });
      showToast('All files synced to Documents/privatesource', 'success');
      setTimeout(() => removeTask(taskId), 3000);
    } catch (err: any) {
      await updateTask(taskId, { status: 'error', error: err.message });
      showToast('Sync failed: ' + err.message, 'error');
    }
  };

  const handlePullFromDevice = async () => {
    if (!EnvironmentChecker.isNativeAndroid()) {
      showToast('Sync only available on Android Native App', 'warning');
      return;
    }

    const taskId = await addTask({ name: 'Pulling files from device', type: 'syncing' });
    await updateTask(taskId, { status: 'running', progress: 0 });

    try {
      const result = await SyncService.pullFromDevice();
      const files = result.files || [];
      const total = files.length;
      let completed = 0;

      for (const file of files) {
        if (file.isDirectory) {
          await apiCall('mkdir', { dirPath: file.path });
        } else {
          await apiCall('write', { filePath: file.path, content: file.data });
        }
        completed++;
        await updateTask(taskId, { progress: (completed / total) * 100 });
      }

      invalidateCache(currentPath);
      loadDirectory(currentPath);
      await updateTask(taskId, { status: 'completed', progress: 100 });
      showToast(`Successfully pulled ${files.length} items from device`, 'success');
      setTimeout(() => removeTask(taskId), 3000);
    } catch (err: any) {
      await updateTask(taskId, { status: 'error', error: err.message });
      showToast('Pull failed: ' + err.message, 'error');
    }
  };

  // Search Hook
  const { 
    searchQuery, setSearchQuery, searchMode, contentSearchResults, contentSnippets,
    loading: searchLoading, handleSearch, toggleSearchMode, searchHistory, clearHistory
  } = useFileSearch(apiCall);

  // Local UI State
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isDropzoneOpen, setIsDropzoneOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [infoFile, setInfoFile] = useState<FileItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | null }>({ x: 0, y: 0, item: null });
  const [pickerModal, setPickerModal] = useState<{ isOpen: boolean; action: 'move' | 'copy'; item: FileItem | null; isBulk?: boolean }>({ isOpen: false, action: 'move', item: null });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  // Load favorites
  useEffect(() => {
    const saved = safeStorage.getItem('ps_favorites');
    if (saved) setFavorites(new Set(JSON.parse(saved)));
  }, []);

  const toggleFavorite = useCallback((e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      safeStorage.setItem('ps_favorites', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      setPreviewFile(item.path);
    }
  };

  const handleBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    loadDirectory(parts.join('/'));
  };

  const handleDownload = async (item: FileItem) => {
    if (item.isDirectory) {
      showToast('Cannot download directory directly. Zip it first.');
      return;
    }
    
    try {
      showToast(`Downloading ${item.name}...`);
      const { saveAs } = await import('file-saver');
      
      if (EnvironmentChecker.isNativeAndroid()) {
        const res = await NativeStorage.readFile({ path: item.path, encoding: 'base64' });
        const byteCharacters = atob(res.data as string);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        saveAs(blob, item.name);
      } else {
        const response = await resilienceEngine.execute('download', async () => {
          const res = await fetch(`/ham-api/private-source/download?path=${encodeURIComponent(item.path)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!res.ok) throw new Error('Download failed');
          return res;
        }) as Response;
        const blob = await response.blob();
        saveAs(blob, item.name);
      }
      showToast('Download complete');
    } catch (err: any) {
      showToast(err.message || 'Download failed');
    }
  };

  const filteredFiles = useMemo(() => {
    return items.filter(file => {
      const matchesSearch = searchMode === 'name' 
        ? file.name.toLowerCase().includes(searchQuery.toLowerCase())
        : contentSearchResults.includes(file.path);
      return matchesSearch;
    }).map(file => {
      if (searchMode === 'content' && contentSnippets[file.path]) {
        return { ...file, snippet: contentSnippets[file.path] };
      }
      return file;
    }).sort((a, b) => {
      const { key, direction } = sortConfig;
      const modifier = direction === 'asc' ? 1 : -1;
      if (key === 'name') return a.name.localeCompare(b.name) * modifier;
      if (key === 'size') return (a.size - b.size) * modifier;
      return ((a.modifiedAt || 0) - (b.modifiedAt || 0)) * modifier;
    });
  }, [items, searchQuery, searchMode, contentSearchResults, contentSnippets, sortConfig]);

  // Resilience Status
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(ServiceStatus.ONLINE);
  useEffect(() => {
    const sub = resilienceEngine.getStatus().subscribe(setServiceStatus);
    return () => sub.unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return <AuthModal onLogin={(pwd) => login(pwd)} loading={authLoading} />;
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-[var(--bg-primary)] relative overflow-hidden">
        {/* Modals & Overlays */}
        {contextMenu.item && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            item={contextMenu.item} 
            onClose={() => setContextMenu({ x: 0, y: 0, item: null })}
            onPreview={(item) => setPreviewFile(item.path)}
            onRename={handleRename}
            onCopy={(item) => setPickerModal({ isOpen: true, action: 'copy', item })}
            onMove={(item) => setPickerModal({ isOpen: true, action: 'move', item })}
            onZip={handleZip}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onInfo={(item) => setInfoFile(item)}
          />
        )}

        <DirectoryPickerModal 
          isOpen={pickerModal.isOpen} 
          onClose={() => setPickerModal({ isOpen: false, action: 'move', item: null, isBulk: false })} 
          onSelect={(destPath) => {
            if (pickerModal.isBulk) {
              const paths = Array.from(selectedItems);
              if (pickerModal.action === 'move') handleBulkMove(paths, destPath);
              else if (pickerModal.action === 'copy') handleBulkCopy(paths, destPath);
              clearSelection();
            } else if (pickerModal.item) {
              if (pickerModal.action === 'move') handleMove(pickerModal.item, destPath);
              else if (pickerModal.action === 'copy') handleCopy(pickerModal.item, destPath);
            }
          }} 
          apiCall={apiCall}
          title={`Select destination to ${pickerModal.action}${pickerModal.isBulk ? ' items' : ''}`}
        />

        <UniversalHolographicPreviewer 
          isOpen={!!previewFile} 
          onClose={() => setPreviewFile(null)} 
          filePath={previewFile || ''} 
          token={token} 
        />
        
        <FileSidebar 
          isOpen={!!infoFile} 
          onClose={() => setInfoFile(null)} 
          item={infoFile} 
          token={token} 
        />
        
        <QuantumDropzone 
          currentPath={currentPath} 
          token={token} 
          externalOpen={isDropzoneOpen}
          onExternalClose={() => setIsDropzoneOpen(false)}
          onUploadComplete={() => { invalidateCache(currentPath); loadDirectory(currentPath); }} 
        />

        {isTrashOpen && (
          <TrashBinModal 
            items={trashItems}
            onRestore={handleRestore} 
            onDelete={handleDeletePermanently} 
            onClose={() => setIsTrashOpen(false)} 
            onEmpty={handleEmptyTrash}
          />
        )}

        {/* Toolbar */}
        <div className="flex flex-col border-b border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <Shield size={20} className="text-violet-400" />
              </div>
              <div className="h-6 w-px bg-[var(--border-color)] mx-2" />
              <button 
                onClick={handleBack} 
                disabled={!currentPath}
                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-all disabled:opacity-30 text-[var(--text-secondary)]"
              >
                <ArrowLeft size={20} />
              </button>
              <Breadcrumb path={currentPath} onClick={loadDirectory} />
              <button 
                onClick={() => loadDirectory(currentPath)} 
                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl transition-all text-[var(--text-secondary)]"
              >
                <RefreshCw size={18} className={fsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <RealtimePresence currentPath={currentPath} userName={token ? 'Fortress Admin' : 'Guest'} />
              <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1.5 rounded-2xl border border-[var(--border-color)]">
                <button onClick={() => setIsDropzoneOpen(true)} className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-violet-400 rounded-xl transition-all" title="Upload Files">
                  <Upload size={18} />
                </button>
                <div className="w-px h-4 bg-[var(--border-color)] mx-1" />
                <button onClick={handleCreateFolder} className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-blue-400 rounded-xl transition-all" title="Create Folder">
                  <Folder size={18} />
                </button>
                <button onClick={handleCreateFile} className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-blue-400 rounded-xl transition-all" title="Create File">
                  <Plus size={18} />
                </button>
                <div className="w-px h-4 bg-[var(--border-color)] mx-1" />
                <button onClick={handleSyncAll} className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-emerald-400 rounded-xl transition-all" title="Push All to Device (Android Documents)">
                  <RefreshCw size={18} />
                </button>
                <button onClick={handlePullFromDevice} className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-amber-400 rounded-xl transition-all" title="Pull All from Device (Android Documents)">
                  <RefreshCw size={18} className="rotate-180" />
                </button>
                <div className="w-px h-4 bg-[var(--border-color)] mx-1" />
                <button onClick={() => { loadTrash(); setIsTrashOpen(true); }} className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-red-400 rounded-xl transition-all" title="Trash Bin">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 pb-4 flex items-center gap-4">
            <SearchBar 
              value={searchQuery} 
              onChange={handleSearch} 
              onToggleMode={toggleSearchMode} 
              mode={searchMode}
              searchHistory={
                <FileSearchHistory 
                  queries={searchHistory} 
                  onSelect={(q) => setSearchQuery(q)} 
                  onClear={clearHistory} 
                />
              }
            />
            <SortControls sortConfig={sortConfig} onSortChange={setSortConfig} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-6">
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-500/20">
            {(fsLoading || searchLoading) && items.length === 0 ? (
              <LoadingSpinner />
            ) : fsError ? (
              <ErrorMessage msg={fsError} />
            ) : filteredFiles.length === 0 ? (
              <EmptyState hasSearch={!!searchQuery} onClearSearch={() => setSearchQuery('')} onUpload={() => setIsDropzoneOpen(true)} />
            ) : (
              <FileGrid 
                items={filteredFiles}
                selectedItems={selectedItems}
                favorites={favorites}
                onToggleSelection={toggleSelection}
                onToggleSelectAll={toggleSelectAll}
                onToggleFavorite={toggleFavorite}
                onItemClick={handleItemClick}
                onContextMenu={(e, item) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item }); }}
                onPreview={(e, item) => { e.stopPropagation(); setPreviewFile(item.path); }}
                onInfo={(e, item) => { e.stopPropagation(); setInfoFile(item); }}
                onDownload={(e, item) => { e.stopPropagation(); handleDownload(item); }}
                onDelete={(e, item) => { e.stopPropagation(); handleDelete(item); }}
              />
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        <BulkActionToolbar 
          count={selectedItems.size} 
          onClear={clearSelection} 
          onDelete={() => { handleBulkDelete(Array.from(selectedItems)); clearSelection(); }} 
          onZip={() => { handleBulkZip(Array.from(selectedItems)); clearSelection(); }} 
          onDownload={() => { handleBulkDownload(Array.from(selectedItems)); clearSelection(); }} 
          onMove={() => setPickerModal({ isOpen: true, action: 'move', item: null, isBulk: true })}
          onCopy={() => setPickerModal({ isOpen: true, action: 'copy', item: null, isBulk: true })}
        />

        {/* Status Bar */}
        <div className="bg-[var(--bg-tertiary)] px-6 py-2 text-[10px] text-[var(--text-secondary)] flex justify-between items-center border-t border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                serviceStatus === ServiceStatus.ONLINE ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                serviceStatus === ServiceStatus.DEGRADED ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              }`} />
              <span className="font-black uppercase tracking-widest">
                {serviceStatus === ServiceStatus.ONLINE ? 'Neural Link Active' : 
                 serviceStatus === ServiceStatus.DEGRADED ? 'Neural Link Degraded' : 
                 serviceStatus === ServiceStatus.CIRCUIT_OPEN ? 'Circuit Open' : 'Neural Link Offline'}
              </span>
            </div>
            <div className="h-4 w-px bg-[var(--border-color)]" />
            <span className="font-black uppercase tracking-widest">{items.length} Objects in View</span>
          </div>
          
          <div className="flex items-center gap-6">
            <StorageUsage 
              used={quota.used} 
              total={quota.total} 
            />
            <div className="h-4 w-px bg-[var(--border-color)]" />
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${serviceStatus !== ServiceStatus.OFFLINE ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="font-black uppercase tracking-widest">
                {serviceStatus !== ServiceStatus.OFFLINE ? 'Server Online' : 'Server Offline'}
              </span>
            </div>
            <span className="font-mono opacity-50 uppercase tracking-widest">V7.2.1-Quantum</span>
          </div>
        </div>

        {/* Floating Assistant */}
        <PrivateSourceAssistant currentPath={currentPath} token={token || ''} />

        {/* Isolation Footer */}
        <div className="absolute bottom-12 right-6 pointer-events-none opacity-30">
          <span className="text-[8px] text-[var(--text-secondary)] font-black uppercase tracking-widest bg-[var(--bg-primary)] px-2 py-1 rounded-md border border-[var(--border-color)]">
            Context Isolated — Session memory tidak dibagikan ke fitur lain
          </span>
        </div>
      </div>
    </ErrorBoundary>
  );
}

