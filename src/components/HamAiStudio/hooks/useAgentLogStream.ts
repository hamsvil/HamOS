import { useState, useEffect, useCallback } from 'react';
import { agentObservabilityService, AgentLog } from '../../../services/agentObservability/AgentObservabilityService';

export function useAgentLogStream() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initial load from IndexedDB
    agentObservabilityService.getLogs(200).then(initialLogs => {
      setLogs(initialLogs.reverse());
    });

    // Subscribe to real-time updates via service (which bridges from HamEventBus)
    const unsubscribe = agentObservabilityService.subscribeToLog((log) => {
      setLogs(prev => {
        const next = [...prev, log];
        return next.slice(-1000); // Keep last 1000 in memory for the UI
      });
    });

    // Setup SSE for server-side logs
    const eventSource = new EventSource('/api/agent-obs/stream');
    
    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);
    
    eventSource.addEventListener('log', (event: any) => {
      const log = JSON.parse(event.data);
      // We don't push back to service here to avoid loops, 
      // but we update the UI if it's not already there
      setLogs(prev => {
        if (prev.some(l => l.timestamp === log.timestamp && l.message === log.message)) return prev;
        return [...prev, log].slice(-1000);
      });
    });

    return () => {
      unsubscribe();
      eventSource.close();
    };
  }, []);

  const clearLogs = useCallback(async () => {
    await agentObservabilityService.clearLogs();
    setLogs([]);
    fetch('/api/agent-obs/logs', { method: 'DELETE' }).catch(() => {});
  }, []);

  return { logs, isConnected, clearLogs };
}
