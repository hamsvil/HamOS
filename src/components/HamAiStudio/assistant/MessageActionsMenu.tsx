import React from 'react';
import { Copy, RotateCcw, MoreHorizontal } from 'lucide-react';

interface MessageActionsMenuProps {
  onCopy: () => void;
  onRegenerate?: () => void;
}

const MessageActionsMenu = ({ onCopy, onRegenerate }: MessageActionsMenuProps) => {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button 
        onClick={onCopy}
        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-md transition-colors"
        title="Copy message"
      >
        <Copy size={14} />
      </button>
      {onRegenerate && (
        <button 
          onClick={onRegenerate}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-md transition-colors"
          title="Regenerate"
        >
          <RotateCcw size={14} />
        </button>
      )}
      <button 
        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-md transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
};

export default MessageActionsMenu;
