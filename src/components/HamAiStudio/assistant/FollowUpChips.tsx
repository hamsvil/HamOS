import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface FollowUpChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

const FollowUpChips = ({ suggestions, onSelect }: FollowUpChipsProps) => {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-300"
        >
          <MessageSquarePlus size={12} />
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default FollowUpChips;
