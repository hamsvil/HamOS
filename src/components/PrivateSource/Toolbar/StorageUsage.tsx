 
import React from 'react';
import { PieChart, HardDrive } from 'lucide-react';

export const DiskUsageBar = ({ usage }: { usage: number }) => (
  <div className="h-1 bg-[var(--bg-tertiary)] rounded-full w-24 overflow-hidden">
    <div className="h-full bg-blue-500" style={{ width: `${usage}%` }} />
  </div>
);

export const FileStorageUsageChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => (
  <div className="flex flex-col gap-2.5 w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-sm">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
        <PieChart size={12} /> Storage Usage
      </span>
      <span className="text-[10px] font-bold text-[var(--text-primary)]">
        {data.reduce((acc, curr) => acc + curr.value, 0)}% Used
      </span>
    </div>
    <div className="flex h-2 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden shadow-inner">
      {data.map((d, i) => (
        <div key={i} className="transition-all duration-500 hover:brightness-110" style={{ width: `${d.value}%`, backgroundColor: d.color }} title={`${d.label}: ${d.value}%`} />
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
          <span className="text-[9px] font-medium text-[var(--text-secondary)]">{d.label}</span>
          <span className="text-[9px] font-bold text-[var(--text-primary)]">{d.value}%</span>
        </div>
      ))}
    </div>
  </div>
);

export const FileStorageQuotaBadge = ({ used, total }: { used: number; total: number }) => {
  const percentage = Math.round((used / total) * 100);
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-color)] shadow-sm">
      <HardDrive size={16} className="text-blue-400" />
      <div className="flex flex-col">
        <div className="flex items-center justify-between w-32 mb-1">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Storage</span>
          <span className="text-[10px] font-bold text-[var(--text-primary)]">{percentage}%</span>
        </div>
        <div className="w-32 h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} 
            style={{ width: `${percentage}%` }} 
          />
        </div>
      </div>
    </div>
  );
};
