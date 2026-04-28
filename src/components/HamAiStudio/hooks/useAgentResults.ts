import { useState, useEffect, useCallback } from 'react';
import { agentObservabilityService, AgentResult } from '../../../services/agentObservability/AgentObservabilityService';

export function useAgentResults() {
  const [results, setResults] = useState<AgentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await agentObservabilityService.getResults(100);
      setResults(data);
    } catch (error) {
      console.error('Failed to fetch agent results:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();

    const unsubscribe = agentObservabilityService.subscribeToResults((newResult) => {
      setResults(prev => [newResult, ...prev].slice(0, 500));
    });

    return () => unsubscribe();
  }, [fetchResults]);

  const deleteResult = useCallback(async (id: number) => {
    await agentObservabilityService.deleteResult(id);
    setResults(prev => prev.filter(r => r.id !== id));
  }, []);

  const togglePin = useCallback(async (id: number) => {
    await agentObservabilityService.togglePinResult(id);
    setResults(prev => prev.map(r => r.id === id ? { ...r, pinned: !r.pinned } : r));
  }, []);

  return { results, isLoading, fetchResults, deleteResult, togglePin };
}
