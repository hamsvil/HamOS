 
import React from 'react';
import { Settings, Trash2, History } from 'lucide-react';
import { CLONES } from '../../../constants/aiClones';

interface AIHubHeaderProps {
  activeClone: typeof CLONES[0];
  clones: typeof CLONES;
  onSelectClone: (clone: typeof CLONES[0]) => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
  onOpenRestore: () => void;
}

export const AIHubHeader: React.FC<AIHubHeaderProps> = ({
  activeClone,
  clones,
  onSelectClone,
  onClearChat,
  onOpenSettings,
  onOpenRestore
}) => {
  return (
    <div className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xl">
          <activeClone.icon size={18} className="text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">{activeClone.name}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{activeClone.model}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select 
          className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 max-w-[150px]"
          value={activeClone.id}
          onChange={(e) => {
            const selected = clones.find(c => c.id === e.target.value);
            if (selected) onSelectClone(selected);
          }}
        >
          {clones.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        
        <button 
          onClick={onOpenRestore}
          className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-secondary)] hover:text-blue-400 transition-colors"
          title="Restore Version"
        >
          <History size={18} />
        </button>

        <button 
          onClick={onClearChat}
          className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-secondary)] hover:text-red-400 transition-colors"
          title="Clear Chat"
        >
          <Trash2 size={18} />
        </button>
        
        <button 
          onClick={onOpenSettings}
          className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-secondary)] transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
};
