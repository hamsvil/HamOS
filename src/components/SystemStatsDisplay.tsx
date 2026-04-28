 
import React, { useState, useEffect } from 'react';
import { Cpu, Activity } from 'lucide-react';

export const SystemStatsDisplay = () => {
  const [stats, setStats] = useState({ cpu: 0, ram: 0 });
  useEffect(() => {
    const updateStats = () => {
      try {
        if ((performance as any).memory) {
          const mem = (performance as any).memory;
          const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
          const total = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
          const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
          setStats({ cpu: 0, ram: percentage });
        }
      } catch (e) {}
    };
    const interval = setInterval(updateStats, 2000);
    updateStats();
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-3 ml-4">
      <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-color)]">
        <Cpu size="0.8rem" className="text-[#00ffcc]" />
        <span>{stats.cpu}%</span>
      </div>
      <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-color)]">
        <Activity size="0.8rem" className="text-[#00ffcc]" />
        <span>{stats.ram}%</span>
      </div>
    </div>
  );
};
