import React from 'react';
import { Bookmark, ExternalLink } from 'lucide-react';

interface BookmarkBarProps {
  bookmarks: any[];
  onNavigate: (url: string) => void;
}

export const BookmarkBar: React.FC<BookmarkBarProps> = ({ bookmarks, onNavigate }) => {
  if (bookmarks.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] overflow-x-auto scrollbar-hide shrink-0">
      <div className="flex items-center gap-1 text-[var(--text-secondary)] mr-2">
        <Bookmark size={10} />
        <span className="text-[8px] font-bold uppercase tracking-widest">Bookmarks</span>
      </div>
      {bookmarks.slice(0, 10).map((bookmark, index) => (
        <button
          key={index}
          onClick={() => onNavigate(bookmark.url)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-color)] transition-all shrink-0 group"
          title={bookmark.url}
        >
          <div className="w-3 h-3 rounded-sm bg-blue-500/20 flex items-center justify-center">
            <ExternalLink size={8} className="text-blue-400" />
          </div>
          <span className="text-[9px] text-[var(--text-primary)] max-w-[100px] truncate font-medium">
            {bookmark.title || bookmark.url}
          </span>
        </button>
      ))}
    </div>
  );
};
