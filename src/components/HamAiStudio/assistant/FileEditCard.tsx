import React from 'react';
import { FileCode, Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { FileEdit } from './assistantTypes';

interface FileEditCardProps {
  fileEdit: FileEdit;
  onOpenDiff?: () => void;
}

const FileEditCard = ({ fileEdit, onOpenDiff }: FileEditCardProps) => {
  const getIcon = () => {
    switch (fileEdit.type) {
      case 'created': return <Plus size={14} className="text-green-400" />;
      case 'edited': return <Edit size={14} className="text-violet-400" />;
      case 'deleted': return <Trash2 size={14} className="text-red-400" />;
    }
  };

  const getBadge = () => {
    const baseClass = "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border";
    switch (fileEdit.type) {
      case 'created': return <span className={`${baseClass} bg-green-500/10 text-green-400 border-green-500/20`}>Created</span>;
      case 'edited': return <span className={`${baseClass} bg-violet-500/10 text-violet-400 border-violet-500/20`}>Edited</span>;
      case 'deleted': return <span className={`${baseClass} bg-red-500/10 text-red-400 border-red-500/20`}>Deleted</span>;
    }
  };

  return (
    <div className="my-2 border border-white/10 rounded-xl bg-[var(--bg-tertiary)]/20 p-3 flex items-center justify-between group hover:border-cyan-500/30 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center border border-white/5">
          <FileCode size={20} className="text-[var(--text-secondary)]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{fileEdit.path.split('/').pop()}</span>
            {getBadge()}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">{fileEdit.path}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {fileEdit.summary && (
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-green-400">+{fileEdit.summary.added}</span>
            <span className="text-red-400">-{fileEdit.summary.removed}</span>
          </div>
        )}
        <button 
          onClick={onOpenDiff}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all opacity-0 group-hover:opacity-100"
          title="View Diff"
        >
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
};

export default FileEditCard;
