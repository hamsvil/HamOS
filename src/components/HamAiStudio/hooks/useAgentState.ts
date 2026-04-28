 
import { useState, useRef } from 'react';
import { GenerationStep } from '../types';

export function useAgentState() {
  const [input, setInput] = useState('');
  const [agentActivities, setAgentActivities] = useState<GenerationStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isExecutingRef = useRef(false);
  const [timer, setTimer] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  return {
    input,
    setInput,
    agentActivities,
    setAgentActivities,
    isLoading,
    setIsLoading,
    isExecutingRef,
    timer,
    setTimer,
    progress,
    setProgress,
    timerRef,
    abortControllerRef
  };
}
