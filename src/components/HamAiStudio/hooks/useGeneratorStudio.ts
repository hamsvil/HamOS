import { useState, useEffect, useRef } from 'react';
import { GenerationRequest, GenerationResult } from '../../../types/generatorStudio';

export const useGeneratorStudio = () => {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = async (request: GenerationRequest) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generator-studio/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Generation failed');
      }
      const data = await res.json();
      setResult(data);
      return data;
    } catch (e: any) {
      if (e.name === 'AbortError') return null;
      setError(e.message);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { generate, generating, result, error };
};
