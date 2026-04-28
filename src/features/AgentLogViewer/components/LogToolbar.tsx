import React from 'react';
import { useAgentObservabilityStore } from '../../../store/agentObservabilityStore';
import { Filter, Trash2, Download, Play, Pause, Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

interface LogToolbarProps {
  onClear: () => void;
  onExport: () => void;
}

export const LogToolbar: React.FC<LogToolbarProps> = ({ onClear, onExport }) => {
  const { logFilters, setLogFilters } = useAgentObservabilityStore();

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-[var(--bg-secondary)]/50">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={logFilters.isPaused ? "destructive" : "outline"}
          onClick={() => setLogFilters({ isPaused: !logFilters.isPaused })}
        >
          {logFilters.isPaused ? <Play size={14} /> : <Pause size={14} />}
          <span className="ml-1">{logFilters.isPaused ? 'Resume' : 'Pause'}</span>
        </Button>
        <Button size="sm" variant="outline" onClick={onClear}>
          <Trash2 size={14} />
          <span className="ml-1">Clear</span>
        </Button>
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download size={14} />
          <span className="ml-1">Export</span>
        </Button>
      </div>
      
      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <Input
          placeholder="Search logs..."
          className="pl-8 h-8"
          value={logFilters.search}
          onChange={(e) => setLogFilters({ search: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={logFilters.autoScroll}
            onChange={(e) => setLogFilters({ autoScroll: e.target.checked })}
          />
          Auto-scroll
        </label>
      </div>
    </div>
  );
};
