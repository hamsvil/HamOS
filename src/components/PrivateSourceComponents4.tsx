 
import React from 'react';
import { CheckSquare, Square, Trash2, FileArchive, Download } from 'lucide-react';
import { SelectionCheckboxProps, SelectAllCheckboxProps, BulkActionToolbarProps } from './PrivateSourceComponents4.types';

export const SelectionCheckbox = ({ selected, onToggle }: SelectionCheckboxProps) => (
  <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
    {selected ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-[var(--text-secondary)]" />}
  </button>
);

export const SelectAllCheckbox = ({ selected, onToggle }: SelectAllCheckboxProps) => (
  <button onClick={onToggle} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
    {selected ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-[var(--text-secondary)]" />}
  </button>
);

export const BulkActionToolbar = ({ count, onDelete, onZip, onDownload }: BulkActionToolbarProps) => (
  <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1.5 rounded-lg border border-[var(--border-color)] shadow-sm">
    <button onClick={onDelete} className="p-1.5 hover:bg-red-500/20 rounded-md text-red-400 transition-colors" title="Delete Selected"><Trash2 size={16} /></button>
    <button onClick={onZip} className="p-1.5 hover:bg-purple-500/20 rounded-md text-purple-400 transition-colors" title="Zip Selected"><FileArchive size={16} /></button>
    <button onClick={onDownload} className="p-1.5 hover:bg-blue-500/20 rounded-md text-blue-400 transition-colors" title="Download Selected"><Download size={16} /></button>
  </div>
);
