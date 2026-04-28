import React from 'react';
import { useAgentObservabilityStore } from '../../../store/agentObservabilityStore';
import { Badge } from '../../../components/ui/badge';
import { X } from 'lucide-react';

export const LogFilterChips: React.FC = () => {
  const { logFilters, setLogFilters } = useAgentObservabilityStore();

  const toggleLevel = (level: string) => {
    const newLevels = logFilters.levels.includes(level)
      ? logFilters.levels.filter(l => l !== level)
      : [...logFilters.levels, level];
    setLogFilters({ levels: newLevels });
  };

  const levels = ['debug', 'info', 'warn', 'error', 'fatal'];

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-[var(--bg-secondary)]/30 border-b border-white/5">
      <span className="text-[10px] text-muted-foreground uppercase font-bold">Levels:</span>
      {levels.map(level => (
        <Badge
          key={level}
          variant={logFilters.levels.includes(level) ? "default" : "outline"}
          className={`cursor-pointer transition-all active:scale-95 ${
            logFilters.levels.includes(level) ? 'opacity-100' : 'opacity-40 hover:opacity-70'
          }`}
          onClick={() => toggleLevel(level)}
        >
          {level}
        </Badge>
      ))}
      
      {logFilters.agentName && (
        <Badge variant="secondary" className="gap-1">
          Agent: {logFilters.agentName}
          <X size={10} className="cursor-pointer" onClick={() => setLogFilters({ agentName: '' })} />
        </Badge>
      )}
    </div>
  );
};
