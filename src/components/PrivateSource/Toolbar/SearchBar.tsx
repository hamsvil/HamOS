import React from 'react';
import { Search, Database } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (q: string) => void;
  onToggleMode: () => void;
  mode: 'name' | 'content';
  searchHistory?: React.ReactNode;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onToggleMode, mode, searchHistory }) => {
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  return (
    <div className="flex-1 relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-secondary)] group-focus-within:text-violet-400 transition-colors">
        <Search size={18} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsHistoryOpen(true)}
        onBlur={() => setTimeout(() => setIsHistoryOpen(false), 200)}
        placeholder={mode === 'name' ? "Search by identifier..." : "Search deep content..."}
        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl pl-12 pr-24 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 transition-all placeholder:text-[var(--text-secondary)]/30 font-black uppercase tracking-widest"
      />
      {isHistoryOpen && searchHistory && (
        <div className="absolute top-full left-0 mt-2 z-50">
          {searchHistory}
        </div>
      )}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
        <button 
          onClick={onToggleMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'content' ? 'bg-violet-500 text-white shadow-[0_0_15px_rgba(167,139,250,0.4)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-violet-400 border border-[var(--border-color)]'}`}
        >
          <Database size={12} />
          {mode === 'content' ? 'Neural' : 'Standard'}
        </button>
      </div>
    </div>
  );
};
