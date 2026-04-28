 
import { useCallback, useRef } from 'react';
import { Mutex } from 'async-mutex';
import { ChatMessageData, ProjectData } from '../types';
import { ReasoningEngine } from '../../../services/super-assistant/ReasoningEngine';
import { useAgentState } from './useAgentState';
import { useProjectState } from './useProjectState';

const executionMutex = new Mutex();

interface UseAgentExecutionProps {
  agentState: ReturnType<typeof useAgentState>;
  projectState: ReturnType<typeof useProjectState>;
}

export function useAgentExecution({ agentState, projectState }: UseAgentExecutionProps) {
  const {
    input,
    setInput,
    setAgentActivities,
    isLoading,
    setIsLoading,
    isExecutingRef,
    setTimer,
    setProgress,
    timerRef,
    abortControllerRef
  } = agentState;

  const { setHistory, saveImmediately, project, setProject } = projectState;
  const reasoningEngine = ReasoningEngine.getInstance();

  const handleCancel = useCallback(() => {
    isExecutingRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Update history to show cancellation
    setHistory(prev => {
        const historyArray = prev || [];
        const last = historyArray[historyArray.length - 1];
        if (last && last.role === 'ai') {
            return [...historyArray.slice(0, -1), { ...last, content: last.content + '\n\n[CANCELLED BY USER]', isError: true }];
        }
        return historyArray;
    });
  }, [setHistory, setIsLoading, isExecutingRef, timerRef, abortControllerRef]);

  const handleSend = useCallback(async (e?: React.FormEvent, promptOverride?: string, isResume: boolean = false) => {
    if (e) e.preventDefault();
    const text = promptOverride || input;
    if (!text.trim() || isLoading || isExecutingRef.current) return;

    isExecutingRef.current = true;
    setInput('');
    setIsLoading(true);
    setTimer(0);
    setProgress(0);
    setAgentActivities([]);

    // Start Timer
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    
    // Create new AbortController
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;
    
    // Use functional update to get latest history
    let userMessageId = Date.now().toString();
    if (!isResume) {
      setHistory(prev => [...prev, { id: userMessageId, role: 'user' as const, content: text }]);
    }
    
    // Placeholder for AI response with Steps
    setHistory(prev => {
      const historyArray = prev || [];
      const last = historyArray[historyArray.length - 1];
      const newHistory = isResume && last && last.role === 'ai' && (last.content.startsWith('⚙️') || last.content.startsWith('Initializing') || last.content.startsWith('Resuming'))
        ? historyArray.slice(0, -1)
        : historyArray;
        
      const isAiReady = (window as any).__HAM_AI_READY__;
      const initialContent = isResume 
        ? 'Resuming AI Engine...' 
        : (isAiReady ? 'Thinking...' : 'Initializing AI Engine...');

      return [...newHistory, { 
        id: (Date.now() + 1).toString(),
        role: 'ai' as const, 
        content: initialContent, 
        steps: [] 
      }];
    });

    try {
      await executionMutex.runExclusive(async () => {
        const signal = abortControllerRef.current?.signal;
        
        let latestHistory: ChatMessageData[] = [];
        setHistory(prev => {
          latestHistory = prev;
          return prev;
        });

        const response = await reasoningEngine.executeReActLoop(
          text, 
          latestHistory, 
          project, 
          (step) => {
            if (step.progress !== undefined) {
              setProgress(Math.round(step.progress));
            }
            
            setAgentActivities(prev => {
              const existingIndex = prev.findIndex(s => s.id === step.id);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = step;
                return updated;
              }
              return [...prev, step];
            });

            setHistory(prev => {
              const historyArray = prev || [];
              const last = historyArray[historyArray.length - 1];
              if (last && last.role === 'ai') {
                const steps = last.steps || [];
                const existingIndex = steps.findIndex(s => s.id === step.id);
                let updatedSteps = [...steps];
                if (existingIndex >= 0) {
                  updatedSteps[existingIndex] = step;
                } else {
                  updatedSteps = [...steps, step];
                }
                
                const currentDetail = step.details && step.details.length > 0 ? step.details[0] : 'Processing...';
                const newContent = `⚙️ **${step.label}**\n${currentDetail}`;
                
                return [...historyArray.slice(0, -1), { ...last, steps: updatedSteps, content: newContent }];
              }
              return historyArray;
            });
          },
          (updatedProject) => {
            setProject(updatedProject);
          },
          signal
        );

        // Finalize
        let finalHistory: ChatMessageData[] = [];
        setHistory(prev => {
          const historyArray = prev || [];
          const last = historyArray[historyArray.length - 1];
          if (last && last.role === 'ai') {
            finalHistory = [...historyArray.slice(0, -1), { ...last, content: response }];
            return finalHistory;
          }
          finalHistory = historyArray;
          return historyArray;
        });
        
        setTimeout(() => {
            saveImmediately?.(undefined, finalHistory).catch(err => {
                console.error('Failed to save final history:', err);
            });
        }, 0);
      });
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message.includes('cancelled') || error.name === 'AbortError') {
          return;
      }
      setHistory(prev => {
        const historyArray = prev || [];
        const last = historyArray[historyArray.length - 1];
        if (last && last.role === 'ai') {
            return [...historyArray.slice(0, -1), { 
              ...last, 
              content: last.content === 'Thinking...' ? `❌ Error: ${error.message}` : last.content + `\n\n❌ Error: ${error.message}`, 
              isError: true 
            }];
        }
        return historyArray;
      });
      console.error("AI Agent Error:", error);
    } finally {
      isExecutingRef.current = false;
      if (abortControllerRef.current === currentAbortController) {
        setIsLoading(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        abortControllerRef.current = null;
      }
    }
  }, [input, isLoading, isExecutingRef, setInput, setIsLoading, setTimer, setProgress, setAgentActivities, timerRef, abortControllerRef, setHistory, project, setProject, saveImmediately, reasoningEngine]);

  return {
    handleSend,
    handleCancel
  };
}
