 
import { useState, useEffect, useMemo } from 'react';
import { AgentActivity } from '../types';
import { useAiGeneration } from './useAiGeneration';
import { useProjectState } from './useProjectState';
import { useAgentState } from './useAgentState';
import { useAgentExecution } from './useAgentExecution';

// Main Hook (Aggregator) - Refactored to use modular hooks
export function useAiAgent(
  projectState: ReturnType<typeof useProjectState>
) {
  const { 
    isLoading: isGenerating, 
    isLocalMode, 
    setIsLocalMode, 
    cancelGeneration: cancelGenerationBase 
  } = useAiGeneration();

  const agentState = useAgentState();
  const { handleSend, handleCancel } = useAgentExecution({ agentState, projectState });

  const {
    input,
    setInput,
    agentActivities,
    isLoading,
    timer,
    progress,
    timerRef
  } = agentState;

  const { setHistory, saveImmediately, history } = projectState;

  const [hasAttemptedResume, setHasAttemptedResume] = useState(false);

  // Listen for clear chat and cancel events
  useEffect(() => {
    const handleClearChat = () => {
      setHistory([]);
      saveImmediately?.().catch(err => console.error('Failed to save chat history:', err));
    };
    const handleCancelEvent = () => {
      handleCancel();
    };
    window.addEventListener('ham-clear-chat', handleClearChat);
    window.addEventListener('ham-cancel-generation', handleCancelEvent);
    return () => {
      window.removeEventListener('ham-clear-chat', handleClearChat);
      window.removeEventListener('ham-cancel-generation', handleCancelEvent);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [setHistory, saveImmediately, handleCancel, timerRef]);

  const mappedActivities: AgentActivity[] = useMemo(() => agentActivities.map(step => ({
    id: step.id,
    type: step.type === 'error' ? 'error' : 
          step.type === 'success' ? 'success' : 
          step.type === 'action' ? 'action' : 'thought',
    title: step.label,
    details: step.details ? step.details.join('\n') : '',
    status: step.status === 'error' ? 'error' : step.status,
    progress: step.progress,
    timestamp: Date.now()
  })), [agentActivities]);

  // Auto-resume on mount or history load
  useEffect(() => {
    if (!hasAttemptedResume && history.length > 0 && !isLoading) {
      const lastMessage = history[history.length - 1];
      const prevMessage = history.length > 1 ? history[history.length - 2] : null;

      const isInterruptedAi = lastMessage.role === 'ai' && (lastMessage.content.startsWith('⚙️') || lastMessage.content.startsWith('Initializing') || lastMessage.content.startsWith('Resuming'));
      const isUnansweredUser = lastMessage.role === 'user';

      if (isInterruptedAi && prevMessage && prevMessage.role === 'user') {
        setHasAttemptedResume(true);
        handleSend(undefined, prevMessage.content, true);
      } else if (isUnansweredUser) {
        setHasAttemptedResume(true);
        handleSend(undefined, lastMessage.content, true);
      } else {
        setHasAttemptedResume(true);
      }
    }
  }, [history, isLoading, hasAttemptedResume, handleSend]);

  return {
    isLoading,
    isLocalMode,
    setIsLocalMode,
    progress,
    timer,
    input,
    setInput,
    agentActivities: mappedActivities,
    handleSend,
    handleCancel
  };
}

