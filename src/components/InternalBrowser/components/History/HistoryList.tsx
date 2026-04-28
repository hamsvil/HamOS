 
import React from 'react';
import { useBrowserStore } from '../../store/browserStore';
import { History as HistoryIcon, Clock } from 'lucide-react';

export const HistoryList = ({ onNavigate }: { onNavigate: (url: string) => void }) => {
  const { history, clearHistory } = useBrowserStore();

  return (
    <div className="flex flex-col bg-[var(--bg-primary)] h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] shrink-0">
        <h2 className="text-sm font-bold text-[var(--text-secondary)]">History</h2>
        {history.length > 0 && (
          <button
            onClick={() => clearHistory()}
            className="text-[10px] font-bold uppercase text-red-400/60 hover:text-red-400 transition-colors px-2 py-0.5 hover:bg-red-500/10 rounded"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center px-4">
            <Clock size={32} className="text-[var(--text-secondary)] opacity-20" />
            <p className="text-xs text-[var(--text-secondary)] opacity-50">No browsing history yet.</p>
          </div>
        ) : (
          history.map((entry: any) => (
            <div
              key={entry.id || `${entry.url}-${entry.timestamp}`}
              className="flex items-center gap-2 p-2 hover:bg-[var(--bg-secondary)] rounded cursor-pointer transition-colors"
              onClick={() => onNavigate(entry.url)}
            >
              <HistoryIcon size={14} className="text-blue-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs truncate text-[var(--text-primary)]">{entry.title || entry.url}</span>
                <span className="text-[10px] text-[var(--text-secondary)] truncate">{entry.url}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
