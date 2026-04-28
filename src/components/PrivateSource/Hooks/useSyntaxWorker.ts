 
import { useState, useEffect, useRef } from 'react';

export type SyntaxLine = Array<{ types: string[], content: string }>;

export const useSyntaxWorker = (code: string, language: string) => {
  const [lineCount, setLineCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const linesRef = useRef<SyntaxLine[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!code) {
      linesRef.current = [];
      setLineCount(0);
      return;
    }

    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(new URL('../../../workers/syntax.worker.ts', import.meta.url), { type: 'module' });
      } catch (error) {
        console.error('Failed to initialize syntax worker:', error);
      }
    }

    workerRef.current.onmessage = (e) => {
      if (e.data.success) {
        linesRef.current = e.data.lines;
        setLineCount(e.data.lines.length);
        setLoading(false);
      } else {
        console.error('Syntax worker error:', e.data.error);
        // Fallback to raw lines
        const rawLines = code.split('\n').map(content => [{ types: [], content }]);
        linesRef.current = rawLines;
        setLineCount(rawLines.length);
        setLoading(false);
      }
    };

    setLoading(true);
    if (workerRef.current) {
      workerRef.current.postMessage({ code, language });
    } else {
      // Fallback if worker failed to initialize
      const rawLines = code.split('\n').map(content => [{ types: [], content }]);
      linesRef.current = rawLines;
      setLineCount(rawLines.length);
      setLoading(false);
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [code, language]);

  return { lineCount, linesRef, loading };
};
