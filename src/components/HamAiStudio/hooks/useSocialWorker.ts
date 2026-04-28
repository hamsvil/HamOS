import { useSocialQueue } from './useSocialQueue';
import { useCredentialVault } from './useCredentialVault';
import { useSocialWorkerStore } from '../../../store/socialWorkerStore';

export const useSocialWorker = () => {
  const queue = useSocialQueue();
  const vault = useCredentialVault();
  const store = useSocialWorkerStore();

  const generateAIContent = async (prompt: string, tone?: string) => {
    const res = await fetch('/api/social-worker/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, tone })
    });
    return res.json();
  };

  return {
    ...queue,
    ...vault,
    selectedPlatforms: store.selectedPlatforms,
    setSelectedPlatforms: store.setSelectedPlatforms,
    generateAIContent,
    isLoggingIn: false // Added to fix TS error in index.tsx
  };
};
