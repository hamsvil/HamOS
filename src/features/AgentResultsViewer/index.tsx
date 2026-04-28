// [AUTO-GENERATED-IMPORTS-START]
import { ResultExportButton } from './components/ResultExportButton';
import { ResultFilterBar } from './components/ResultFilterBar';
import { ResultSearchBox } from './components/ResultSearchBox';
import { ResultDiffViewer } from './components/ResultDiffViewer';
import { ResultsGrid } from './components/ResultsGrid';
import { ResultDetailModal } from './components/ResultDetailModal';
// [AUTO-GENERATED-IMPORTS-END]
import React, { useState, Suspense } from 'react';
import { useAgentResults } from '../../components/HamAiStudio/hooks/useAgentResults';
import { AgentResult } from '../../services/agentObservability/AgentObservabilityService';
import { useAgentObservabilityStore } from '../../store/agentObservabilityStore';
import { Button } from '../../components/ui/button';
import { LayoutGrid, List, Columns, RefreshCw, Loader2, Database } from 'lucide-react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const AgentResultsViewerContent: React.FC = () => {
  const { results, isLoading, fetchResults, deleteResult, togglePin } = useAgentResults();
  const { resultFilters } = useAgentObservabilityStore();
  const [selectedResult, setSelectedResult] = useState<AgentResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  const filteredResults = results.filter(res => {
    if (resultFilters.type !== 'all' && res.mimeType !== resultFilters.type) return false;
    if (resultFilters.status !== 'all' && res.status !== resultFilters.status) return false;
    if (resultFilters.search && !res.task.toLowerCase().includes(resultFilters.search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedForDiff = results.filter(r => r.id && selectedIds.includes(r.id)).slice(0, 2);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-[var(--bg-secondary)]">
        <h2 className="text-sm font-bold uppercase tracking-wider">Agent Result Artifacts</h2>
        <div className="flex items-center gap-2">
          {selectedIds.length === 2 && (
            <Button size="sm" variant="outline" onClick={() => setShowDiff(true)}>
              <Columns size={14} className="mr-1" /> Compare (Diff)
            </Button>
          )}
          <ResultExportButton results={filteredResults} />
          <Button size="sm" variant="ghost" onClick={fetchResults} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 bg-[var(--bg-secondary)]/30 border-b border-white/5">
        <ResultFilterBar />
        <ResultSearchBox />
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {showDiff && selectedForDiff.length === 2 ? (
          <div className="absolute inset-0 z-20 p-4 bg-black/40 backdrop-blur-md">
            <ResultDiffViewer results={selectedForDiff} onClose={() => setShowDiff(false)} />
          </div>
        ) : null}
        
        {isLoading && results.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Scanning result database...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-slate-600">
             <Database size={48} className="opacity-20" />
             <p className="italic">No artifacts found matching criteria</p>
          </div>
        ) : (
          <ResultsGrid 
            results={filteredResults}
            onSelect={setSelectedResult}
            onDelete={deleteResult}
            onTogglePin={togglePin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )}
      </div>

      <ResultDetailModal 
        result={selectedResult} 
        onClose={() => setSelectedResult(null)} 
      />
      
      <div className="px-4 py-1 text-[10px] text-muted-foreground border-t border-white/5 bg-[var(--bg-secondary)] flex justify-between">
        <span>Showing {filteredResults.length} of {results.length} artifacts</span>
        {selectedIds.length > 0 && <span>{selectedIds.length} items selected</span>}
      </div>
    </div>
  );
};

export const AgentResultsViewer: React.FC = () => (
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center h-full bg-[var(--bg-primary)]"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
      <AgentResultsViewerContent />
    </Suspense>
  </ErrorBoundary>
);

export default AgentResultsViewer;
