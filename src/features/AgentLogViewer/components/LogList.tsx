import React, { useRef, useEffect } from 'react';
import { AgentLog } from '../../../services/agentObservability/AgentObservabilityService';
import { LogEntry } from './LogEntry';
import { useAgentObservabilityStore } from '../../../store/agentObservabilityStore';

interface LogListProps {
  logs: AgentLog[];
}

export const LogList: React.FC<LogListProps> = ({ logs }) => {
  const { logFilters } = useAgentObservabilityStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(log => {
    if (logFilters.agentName && log.agentName !== logFilters.agentName) return false;
    if (logFilters.levels.length > 0 && !logFilters.levels.includes(log.level)) return false;
    if (logFilters.search && !log.message.toLowerCase().includes(logFilters.search.toLowerCase())) return false;
    return true;
  });

  // Simple windowing: show last 200
  const visibleLogs = filteredLogs.slice(-200);

  useEffect(() => {
    if (logFilters.autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLogs, logFilters.autoScroll]);

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-black/90"
    >
      {visibleLogs.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground italic">
          No logs found matching filters...
        </div>
      ) : (
        visibleLogs.map((log, idx) => (
          <LogEntry key={`${log.timestamp}-${idx}`} log={log} />
        ))
      )}
    </div>
  );
};
