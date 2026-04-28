import React, { useState } from 'react';
import { AgentLog } from '../../../services/agentObservability/AgentObservabilityService';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface LogEntryProps {
  log: AgentLog;
}

const LEVEL_COLORS: Record<string, string> = {
  debug: 'text-gray-400',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  fatal: 'text-red-600 font-bold',
};

export const LogEntry: React.FC<LogEntryProps> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="border-l-2 border-transparent hover:border-primary/30 hover:bg-white/5 transition-colors">
      <div className="flex items-start gap-2 py-0.5">
        <button 
          className={`mt-0.5 p-0.5 hover:bg-white/10 rounded transition-colors ${!log.details && 'invisible'}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        
        <span className="text-gray-500 whitespace-nowrap">[{timeStr}]</span>
        <span className="text-primary/80 whitespace-nowrap font-bold">[{log.agentName}]</span>
        <span className={`${LEVEL_COLORS[log.level] || 'text-white'} uppercase w-12 text-center`}>{log.level}</span>
        <span className="flex-1 break-words">{log.message}</span>
      </div>
      
      {isExpanded && log.details && (
        <pre className="ml-8 p-2 bg-black/50 rounded border border-white/10 overflow-x-auto text-[10px] text-gray-300">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  );
};
