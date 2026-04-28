 
import React from 'react';
import { ChevronRight } from 'lucide-react';

export const Breadcrumb = ({ path, onClick }: { path: string; onClick: (p: string) => void }) => (
  <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] font-medium">
    <button onClick={() => onClick('')} className="hover:text-blue-400 transition-colors bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg border border-[var(--border-color)]">root</button>
    {path.split('/').filter(Boolean).map((p, i, arr) => (
      <React.Fragment key={i}>
        <ChevronRight size={14} className="opacity-50" />
        <button onClick={() => onClick(arr.slice(0, i + 1).join('/'))} className="hover:text-blue-400 transition-colors bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg border border-[var(--border-color)]">{p}</button>
      </React.Fragment>
    ))}
  </div>
);
