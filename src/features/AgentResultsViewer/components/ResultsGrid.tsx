import React from 'react';
import { AgentResult } from '../../../services/agentObservability/AgentObservabilityService';
import { ResultCard } from './ResultCard';

interface ResultsGridProps {
  results: AgentResult[];
  onSelect: (result: AgentResult) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({ 
  results, onSelect, onDelete, onTogglePin, selectedIds, onToggleSelect 
}) => {
  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
        <div className="w-16 h-16 mb-4 opacity-20 bg-primary rounded-full flex items-center justify-center">
           <span className="text-4xl">🗂️</span>
        </div>
        <h3 className="text-lg font-bold">No results found</h3>
        <p className="max-w-xs">Run agent tasks to see output artifacts here.</p>
      </div>
    );
  }

  // Sort pinned to top
  const sortedResults = [...results].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedResults.map((result) => (
          <ResultCard
            key={result.id}
            result={result}
            onClick={() => onSelect(result)}
            onDelete={() => result.id && onDelete(result.id)}
            onTogglePin={() => result.id && onTogglePin(result.id)}
            isSelected={selectedIds.includes(result.id!)}
            onSelect={() => result.id && onToggleSelect(result.id)}
          />
        ))}
      </div>
    </div>
  );
};
