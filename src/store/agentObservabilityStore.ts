import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AgentObservabilityUIState {
  logFilters: {
    levels: string[];
    agentName: string;
    search: string;
    autoScroll: boolean;
    isPaused: boolean;
  };
  resultFilters: {
    type: string;
    agent: string;
    status: string;
    search: string;
  };
  setLogFilters: (filters: Partial<AgentObservabilityUIState['logFilters']>) => void;
  setResultFilters: (filters: Partial<AgentObservabilityUIState['resultFilters']>) => void;
}

export const useAgentObservabilityStore = create<AgentObservabilityUIState>()(
  persist(
    (set) => ({
      logFilters: {
        levels: ['debug', 'info', 'warn', 'error', 'fatal'],
        agentName: '',
        search: '',
        autoScroll: true,
        isPaused: false,
      },
      resultFilters: {
        type: 'all',
        agent: 'all',
        status: 'all',
        search: '',
      },
      setLogFilters: (filters) =>
        set((state) => ({ logFilters: { ...state.logFilters, ...filters } })),
      setResultFilters: (filters) =>
        set((state) => ({ resultFilters: { ...state.resultFilters, ...filters } })),
    }),
    {
      name: 'ham-agent-obs-storage',
      partialize: (state) => ({ 
        logFilters: { 
          levels: state.logFilters.levels,
          autoScroll: state.logFilters.autoScroll
        } 
      }),
    }
  )
);
