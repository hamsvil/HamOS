import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureAgentState {
  // featureId -> agentId
  assignments: Record<string, string>;
  assignAgent: (featureId: string, agentId: string) => void;
}

export const useFeatureAgentStore = create<FeatureAgentState>()(
  persist(
    (set) => ({
      assignments: {
        'neural-pilot': 'lisa',
        'social-worker': 'lisa',
        'media-agent': 'lisa',
        'h-camera': 'lisa',
        'generator-studio': 'lisa',
        'aeterna-glass': 'lisa',
        'agent-logs': 'lisa',
        'agent-results': 'lisa',
        'main-assistant': 'lisa',
      },
      assignAgent: (featureId, agentId) => 
        set((state) => ({
          assignments: { ...state.assignments, [featureId]: agentId }
        })),
    }),
    {
      name: 'ham-feature-agent-storage',
    }
  )
);
