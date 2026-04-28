 
import React from 'react';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface SortControlsProps {
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
}

export const SortControls = ({ sortConfig, onSortChange }: SortControlsProps) => {
  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [key, direction] = value.split('-');
    onSortChange({ key, direction: direction as 'asc' | 'desc' });
  };
  
  const currentValue = `${sortConfig.key}-${sortConfig.direction}`;

  return (
    <select 
      value={currentValue}
      onChange={handleSort} 
      className="bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm appearance-none cursor-pointer pr-10 relative"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em 1em' }}
    >
      <option value="name-asc">Name (A-Z)</option>
      <option value="name-desc">Name (Z-A)</option>
      <option value="size-desc">Size (Largest)</option>
      <option value="size-asc">Size (Smallest)</option>
      <option value="modifiedAt-desc">Date (Newest)</option>
      <option value="modifiedAt-asc">Date (Oldest)</option>
    </select>
  );
};
