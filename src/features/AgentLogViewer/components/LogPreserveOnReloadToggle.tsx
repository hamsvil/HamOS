import React from 'react';
import { useAgentObservabilityStore } from '../../../store/agentObservabilityStore';
import { Badge } from '../../../components/ui/badge';
import { Save } from 'lucide-react';

export const LogPreserveOnReloadToggle: React.FC = () => {
  // We use the Zustand store which is already persisted
  const { logFilters, setLogFilters } = useAgentObservabilityStore();

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={logFilters.autoScroll} // Re-using autoScroll for persistence context if needed or add new field
          onChange={(e) => setLogFilters({ autoScroll: e.target.checked })}
        />
        <Save size={10} />
        Preserve UI State
      </label>
    </div>
  );
};
