 
import { useState, useRef } from 'react';
import { FileAttachment } from '../../../types/ai';
import { useAIHubStore } from '../../../store/aiHubStore';
import { Orchestrator } from '../../../services/aiHub/core/Orchestrator';
import { useAIHubChat_Part1 } from './useAIHubChat_Part1';
import { useAIHubChat_Part2 } from './useAIHubChat_Part2';
import { useToast } from '../../../context/ToastContext';

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
  const { history, setHistory, setIsLoading, selectedFiles, setSelectedFiles, activeClone, setLastError } = useAIHubStore();
  
  const [loadingProgress, setLoadingProgress] = useState<{ progress: number; text: string } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [summaryContext, setSummaryContext] = useState('');
  
  const activeMessageRef = useRef<string>('');
  const isProcessingRef = useRef<boolean>(false);
  const orchestratorRef = useRef<Orchestrator | null>(null);
  if (!orchestratorRef.current) {
    orchestratorRef.current = new Orchestrator({
      maxTokensBeforeLocal: 8000,
      maxTokensBeforeCompression: 100000,
      circuitBreakerThreshold: 3,
      circuitBreakerResetTimeoutMs: 60000
    });
  }

  const part1 = useAIHubChat_Part1({
    saveMessageToDB,
    customInstruction,
    allInstructions,
    singularityMode,
    currentSessionId,
    setIsLoading,
    setLoadingProgress,
    setAbortController,
    setSummaryContext,
    activeMessageRef,
    isProcessingRef,
    orchestratorRef,
    history,
    setHistory,
    selectedFiles,
    setSelectedFiles,
    activeClone,
    setLastError
  });

  const part2 = useAIHubChat_Part2({
    saveMessageToDB,
    showToast,
    abortController,
    setAbortController,
    setIsLoading,
    setLastError,
    history,
    setHistory,
    handleSend: part1.handleSend
  });

  return {
    handleSend: part1.handleSend,
    handleCancel: part2.handleCancel,
    handleShellExecute: part2.handleShellExecute,
    retryLastMessage: part2.retryLastMessage,
    loadingProgress,
    isLoading: useAIHubStore.getState().isLoading,
    summaryContext,
    abortController
  };
}


