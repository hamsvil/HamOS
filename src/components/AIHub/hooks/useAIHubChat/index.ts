 
import { useState } from 'react';
import { useToast } from '../../../../context/ToastContext';
import { useAIHubStore } from '../../../../store/aiHubStore';
import { FileAttachment } from '../../../../types/ai';
import { useAIHubChatLogic } from './useAIHubChatLogic';

interface UseAIHubChatProps {
  saveMessageToDB: (role: 'user' | 'ai', content: string, image?: string, audio?: string, video?: string, files?: FileAttachment[], timestampOverride?: number, skipStateUpdate?: boolean) => Promise<number | string | void>;
  customInstruction: string;
  allInstructions: string;
  singularityMode: boolean;
  currentSessionId: string;
}

export function useAIHubChat({
  saveMessageToDB,
  customInstruction,
  allInstructions,
  singularityMode,
  currentSessionId
}: UseAIHubChatProps) {
  const { showToast } = useToast();
  const { isLoading } = useAIHubStore();
  
  const [loadingProgress, setLoadingProgress] = useState<{ progress: number; text: string } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [summaryContext, setSummaryContext] = useState('');
  
  const logicProps = {
    saveMessageToDB,
    customInstruction,
    allInstructions,
    singularityMode,
    currentSessionId,
    showToast,
    setLoadingProgress,
    setAbortController,
    setSummaryContext,
    abortController
  };

  const { 
    handleSend, 
    handleShellExecute, 
    handleCancel, 
    retryLastMessage 
  } = useAIHubChatLogic(logicProps);

  return {
    isLoading,
    loadingProgress,
    abortController,
    summaryContext,
    setSummaryContext,
    handleSend,
    handleShellExecute,
    handleCancel,
    retryLastMessage
  };
}
