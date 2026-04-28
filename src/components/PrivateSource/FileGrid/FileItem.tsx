import React from 'react';
import { Eye, Info, Download, Trash2, MoreVertical } from 'lucide-react';
import { FileItem as FileItemType } from '../types';
import { FileIcon, FileSize, FileDate, FileTagBadge, FileEncryptionStatus, FileOwnerAvatar, FileSyncStatus, FileFavoriteButton } from './FileComponents';
import { ErrorBoundary } from '../../ErrorBoundary';

interface FileItemProps {
  item: FileItemType;
  isSelected: boolean;
  isFavorite: boolean;
  onToggleSelection: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onPreview: (e: React.MouseEvent) => void;
  onInfo: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  item,
  isSelected,
  isFavorite,
  onToggleSelection,
  onToggleFavorite,
  onClick,
  onContextMenu,
  onPreview,
  onInfo,
  onDownload,
  onDelete
}) => {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20 text-xs">Failed to render item: {item?.name || 'Unknown'}</div>}>
      <div 
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={`flex items-center p-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-500 cursor-pointer group overflow-hidden shadow-sm relative ${isSelected ? 'bg-violet-500/10 border-violet-500/30' : ''}`}
      >
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
        )}
        
        {/* Selection Checkbox */}
        <div className="w-[5%] flex-shrink-0 flex justify-center border-r border-[var(--border-color)] py-2">
          <div 
            className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-violet-500 border-violet-500 shadow-md' : 'bg-white/10 border-white/20 hover:border-violet-400'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection();
            }}
          >
            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
          </div>
        </div>

        <div className="w-[50%] flex items-center gap-3 px-4 border-r border-[var(--border-color)] py-2 overflow-hidden min-w-0">
          <div className={`p-1 rounded-lg transition-all duration-500 shrink-0 ${isSelected ? 'bg-violet-500/20' : 'bg-[var(--bg-tertiary)] group-hover:bg-violet-500/10'}`}>
            <FileIcon name={item.name} isDirectory={item.isDirectory} />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[var(--text-primary)] truncate group-hover:text-violet-400 transition-colors tracking-tight uppercase" title={item.name}>{item.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.tags?.map(tag => <FileTagBadge key={tag} tag={tag} />)}
                {item.isEncrypted && <FileEncryptionStatus isEncrypted={true} />}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--bg-tertiary)] rounded-full border border-[var(--border-color)] shrink-0">
                <FileOwnerAvatar name={item.owner || 'You'} imageUrl={item.ownerAvatar} />
                <span className="text-[var(--text-secondary)] text-[8px] font-black uppercase tracking-widest opacity-50 truncate max-w-[60px]">{item.owner || 'You'}</span>
              </div>
              <span className="text-[var(--text-secondary)] text-[10px] font-medium opacity-20 shrink-0">•</span>
              <div className="shrink-0"><FileSyncStatus status={item.syncStatus || 'synced'} /></div>
            </div>
            {item.snippet && (
              <div className="mt-1.5 text-[10px] text-[var(--text-secondary)] font-mono truncate opacity-60 bg-violet-500/5 px-2 py-1 rounded-md border border-violet-500/10">
                {item.snippet}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FileFavoriteButton isFavorite={isFavorite} onClick={onToggleFavorite} />
          </div>
        </div>
        
        <div className="w-[15%] flex-shrink-0 flex items-center px-4 border-r border-[var(--border-color)] py-2 text-[10px] font-black font-mono text-violet-400/70 uppercase tracking-widest truncate">
          {!item.isDirectory && <FileSize size={item.size} />}
        </div>
        
        <div className="w-[20%] flex-shrink-0 flex items-center px-4 border-r border-[var(--border-color)] py-2 text-[10px] font-black font-mono text-[var(--text-secondary)] uppercase tracking-widest opacity-60 truncate">
          <FileDate modifiedAt={item.modifiedAt} />
        </div>
        
        <div className="w-[10%] flex-shrink-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-500 px-2 py-1 translate-x-4 group-hover:translate-x-0">
          {!item.isDirectory && (
            <button onClick={onPreview} aria-label="Preview" className="p-1.5 hover:bg-violet-500/10 rounded-lg text-[var(--text-secondary)] hover:text-violet-400 transition-all active:scale-90 border border-transparent hover:border-violet-500/20" title="Preview">
              <Eye size={14} />
            </button>
          )}
          <button onClick={onInfo} aria-label="Info" className="p-1.5 hover:bg-violet-500/10 rounded-lg text-[var(--text-secondary)] hover:text-violet-400 transition-all active:scale-90 border border-transparent hover:border-violet-500/20" title="Info">
            <Info size={14} />
          </button>
          <button onClick={onDownload} aria-label="Download" className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-[var(--text-secondary)] hover:text-emerald-400 transition-all active:scale-90 border border-transparent hover:border-emerald-500/20" title="Download">
            <Download size={14} />
          </button>
          <button onClick={onDelete} aria-label="Delete" className="p-1.5 hover:bg-red-500/10 rounded-lg text-[var(--text-secondary)] hover:text-red-400 transition-all active:scale-90 border border-transparent hover:border-red-500/20" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

