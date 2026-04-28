import React from 'react';
import { useAgentObservabilityStore } from '../../../store/agentObservabilityStore';
import { Input } from '../../../components/ui/input';
import { Search } from 'lucide-react';

export const ResultSearchBox: React.FC = () => {
  const { resultFilters, setResultFilters } = useAgentObservabilityStore();

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
      <Input
        placeholder="Search artifacts..."
        className="pl-8 h-8 text-xs"
        value={resultFilters.search}
        onChange={(e) => setResultFilters({ search: e.target.value })}
      />
    </div>
  );
};
