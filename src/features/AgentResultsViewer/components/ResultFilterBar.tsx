import React from 'react';
import { useAgentObservabilityStore } from '../../../store/agentObservabilityStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Filter } from 'lucide-react';

export const ResultFilterBar: React.FC = () => {
  const { resultFilters, setResultFilters } = useAgentObservabilityStore();

  return (
    <div className="flex flex-wrap items-center gap-3 p-2 bg-[var(--bg-secondary)]/50 border-b border-white/5">
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-muted-foreground" />
        <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
      </div>
      
      <Select value={resultFilters.type} onValueChange={(v) => setResultFilters({ type: v })}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="text/plain">Text</SelectItem>
          <SelectItem value="application/json">JSON</SelectItem>
          <SelectItem value="image/png">Image</SelectItem>
          <SelectItem value="text/markdown">Markdown</SelectItem>
        </SelectContent>
      </Select>

      <Select value={resultFilters.status} onValueChange={(v) => setResultFilters({ status: v })}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ok">Success</SelectItem>
          <SelectItem value="error">Error</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
