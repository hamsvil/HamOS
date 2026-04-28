 
import { Virtuoso } from 'react-virtuoso';
import { FileItem as FileItemType } from '../types';
import { FileItem } from './FileItem';
import { ErrorBoundary } from '../../ErrorBoundary';

interface FileGridProps {
  items: FileItemType[];
  selectedItems: Set<string>;
  favorites: Set<string>;
  onToggleSelection: (path: string) => void;
  onToggleSelectAll: () => void;
  onToggleFavorite: (e: React.MouseEvent, path: string) => void;
  onItemClick: (item: FileItemType) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItemType) => void;
  onPreview: (e: React.MouseEvent, item: FileItemType) => void;
  onInfo: (e: React.MouseEvent, item: FileItemType) => void;
  onDownload: (e: React.MouseEvent, item: FileItemType) => void;
  onDelete: (e: React.MouseEvent, item: FileItemType) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({
  items,
  selectedItems,
  favorites,
  onToggleSelection,
  onToggleSelectAll,
  onToggleFavorite,
  onItemClick,
  onContextMenu,
  onPreview,
  onInfo,
  onDownload,
  onDelete
}) => {
  const isAllSelected = items.length > 0 && selectedItems.size === items.length;

  return (
    <div className="flex flex-col gap-2 h-full flex-1 min-h-0">
      <div className="flex items-center p-0 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[10px] font-black text-violet-400/60 uppercase tracking-[0.2em] overflow-hidden shadow-xl sticky top-0 z-10 backdrop-blur-2xl bg-opacity-90 flex-shrink-0">
        <div className="w-[5%] flex-shrink-0 flex justify-center border-r border-[var(--border-color)] py-2">
          <div 
            className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
              isAllSelected ? 'bg-violet-500 border-violet-500 shadow-md' : 'bg-white/10 border-white/20 hover:border-violet-400'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelectAll();
            }}
          >
            {isAllSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
          </div>
        </div>
        <div className="w-[50%] min-w-0 border-r border-[var(--border-color)] py-2 px-4 text-left truncate">Name</div>
        <div className="w-[15%] flex-shrink-0 border-r border-[var(--border-color)] py-2 px-4 text-left truncate">Size</div>
        <div className="w-[20%] flex-shrink-0 border-r border-[var(--border-color)] py-2 px-4 text-left truncate">Modified</div>
        <div className="w-[10%] flex-shrink-0 py-2 px-4 text-center truncate">Actions</div>
      </div>

      {items.length > 100 && (
        <div className="px-4 py-1 bg-violet-500/10 border-x border-b border-violet-500/20 text-[8px] text-violet-400 font-bold uppercase tracking-widest text-center">
          Virtualized Viewport Active — Showing first 100 of {items.length} objects for performance
        </div>
      )}
      
      <ErrorBoundary fallback={<div className="p-4 text-red-500">File Grid Error</div>}>
        <Virtuoso
          className="flex-1 min-h-0 custom-scrollbar"
          totalCount={items.length}
          itemContent={(index) => {
            const item = items[index];
            return (
              <div className="mb-2">
                <FileItem
                  item={item}
                  isSelected={selectedItems.has(item.path)}
                  isFavorite={favorites.has(item.path)}
                  onToggleSelection={() => onToggleSelection(item.path)}
                  onToggleFavorite={(e) => onToggleFavorite(e, item.path)}
                  onClick={() => onItemClick(item)}
                  onContextMenu={(e) => onContextMenu(e, item)}
                  onPreview={(e) => onPreview(e, item)}
                  onInfo={(e) => onInfo(e, item)}
                  onDownload={(e) => onDownload(e, item)}
                  onDelete={(e) => onDelete(e, item)}
                />
              </div>
            );
          }}
        />
      </ErrorBoundary>
    </div>
  );
};

