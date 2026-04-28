// [AUTO-GENERATED-IMPORTS-START]
import { LogPreserveOnReloadToggle } from './components/LogPreserveOnReloadToggle';
import { LogLevelLegend } from './components/LogLevelLegend';
import { LogToolbar } from './components/LogToolbar';
import { LogFilterChips } from './components/LogFilterChips';
import { LogList } from './components/LogList';
import { LogStatsBar } from './components/LogStatsBar';
// [AUTO-GENERATED-IMPORTS-END]
import React, { Suspense } from 'react';
import { useAgentLogStream } from '../../components/HamAiStudio/hooks/useAgentLogStream';
import { useAgentObservabilityStore } from '../../store/agentObservabilityStore';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const AgentLogViewerContent: React.FC = () => {
  const { logs, isConnected, clearLogs } = useAgentLogStream();
  const { logFilters } = useAgentObservabilityStore();

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `agent_logs_${new Date().toISOString()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      console.error('Failed to export logs', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <h2 className="text-sm font-bold uppercase tracking-wider">Agent Process Logs</h2>
        </div>
        <div className="flex items-center gap-4">
          <LogPreserveOnReloadToggle />
          <LogLevelLegend />
        </div>
      </div>
      
      <LogToolbar onClear={clearLogs} onExport={handleExport} />
      <LogFilterChips />
      
      {logs.length === 0 && !isConnected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Connecting to log stream...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 italic">
          No logs found for current filters.
        </div>
      ) : (
        <LogList logs={logFilters.isPaused ? [] : logs} />
      )}
      
      <LogStatsBar logs={logs} />
    </div>
  );
};

export const AgentLogViewer: React.FC = () => (
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center h-full bg-[var(--bg-primary)]"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
      <AgentLogViewerContent />
    </Suspense>
  </ErrorBoundary>
);

export default AgentLogViewer;
