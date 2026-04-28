 
import React from 'react';
import { FileText } from 'lucide-react';

export const FileActionProperties = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="Properties">
    <FileText size={16} className="text-[var(--text-secondary)]" />
  </button>
);
