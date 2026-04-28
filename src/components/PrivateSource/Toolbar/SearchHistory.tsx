 
import React from 'react';
import { History, Search } from 'lucide-react';

export interface FileSearchHistoryProps {
  queries: string[];
  onSelect: (q: string) => void;
  onClear: () => void;
}

export const FileSearchHistory = ({ queries, onSelect, onClear }: FileSearchHistoryProps) => (
  <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl w-64 backdrop-blur-xl bg-opacity-95">
    <div className="flex items-center justify-between mb-3 px-1">
      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
        <History size={12} /> Recent Searches
      </span>
      <button onClick={onClear} className="text-[9px] font-medium text-red-400 hover:text-red-300 hover:underline transition-colors">Clear All</button>
    </div>
    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
      {queries.map((q, i) => (
        <button 
          key={i} 
          onClick={() => onSelect(q)}
          className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg flex items-center gap-2.5 transition-all hover:pl-4 group"
        >
          <Search size={12} className="text-[var(--text-secondary)] group-hover:text-blue-400 transition-colors" />
          <span className="truncate flex-1">{q}</span>
        </button>
      ))}
    </div>
  </div>
);
