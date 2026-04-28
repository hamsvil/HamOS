import React, { useMemo } from 'react';
import { AgentLog } from '../../../services/agentObservability/AgentObservabilityService';

interface LogStatsBarProps {
  logs: AgentLog[];
}

export const LogStatsBar: React.FC<LogStatsBarProps> = ({ logs }) => {
  const stats = useMemo(() => {
    const levels = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
    logs.forEach(log => {
      if (levels.hasOwnProperty(log.level)) {
        levels[log.level as keyof typeof levels]++;
      }
    });
    
    // Calculate rate (logs/sec) based on last 10 seconds
    const now = Date.now();
    const last10s = logs.filter(l => l.timestamp > now - 10000).length;
    const rate = (last10s / 10).toFixed(1);
    
    return { ...levels, rate };
  }, [logs]);

  return (
    <div className="flex items-center gap-4 px-4 py-1 text-[10px] bg-[var(--bg-secondary)] border-t border-white/5">
      <div className="flex items-center gap-3 border-r border-white/10 pr-4">
        <span className="text-blue-400">INFO: {stats.info}</span>
        <span className="text-yellow-400">WARN: {stats.warn}</span>
        <span className="text-red-400">ERR: {stats.error}</span>
        <span className="text-red-600 font-bold">FATAL: {stats.fatal}</span>
      </div>
      <div className="text-muted-foreground italic">
        Current Rate: {stats.rate} logs/sec
      </div>
      <div className="flex-1" />
      <div className="text-muted-foreground uppercase">
        Memory Buffer: {logs.length} entries
      </div>
    </div>
  );
};
