 
import React from 'react';
import { useBrowserStore } from '../../store/browserStore';
import { Star, Trash2, BookmarkPlus } from 'lucide-react';

export const BookmarkList = ({ onNavigate }: { onNavigate: (url: string) => void }) => {
  const { bookmarks, removeBookmark } = useBrowserStore();

  return (
    <div className="flex flex-col bg-[var(--bg-primary)] h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] shrink-0">
        <h2 className="text-sm font-bold text-[var(--text-secondary)]">Bookmarks</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center px-4">
            <BookmarkPlus size={32} className="text-[var(--text-secondary)] opacity-20" />
            <p className="text-xs text-[var(--text-secondary)] opacity-50">No bookmarks saved yet.</p>
            <p className="text-[10px] text-[var(--text-secondary)] opacity-30">Click the bookmark icon in the toolbar to save a page.</p>
          </div>
        ) : (
          bookmarks.map((bm: any) => (
            <div key={bm.id || bm.url} className="flex items-center justify-between p-2 hover:bg-[var(--bg-secondary)] rounded cursor-pointer group transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => onNavigate(bm.url)}>
                <Star size={14} className="text-yellow-500 shrink-0" />
                <span className="text-xs truncate text-[var(--text-primary)]">{bm.title || bm.url}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeBookmark(bm.url); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded shrink-0 ml-2 transition-all"
              >
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
