 
import { useRef, useCallback, useSyncExternalStore } from 'react';

export function useStreamingText() {
  const textRef = useRef('');
  const subscribersRef = useRef<Set<() => void>>(new Set());

  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => subscribersRef.current.delete(callback);
  }, []);

  const getSnapshot = useCallback(() => textRef.current, []);

  const setText = useCallback((text: string) => {
    textRef.current = text;
    subscribersRef.current.forEach(cb => cb());
  }, []);

  const appendText = useCallback((text: string) => {
    textRef.current += text;
    subscribersRef.current.forEach(cb => cb());
  }, []);

  const clearText = useCallback(() => {
    textRef.current = '';
    subscribersRef.current.forEach(cb => cb());
  }, []);

  return {
    subscribe,
    getSnapshot,
    setText,
    appendText,
    clearText,
    textRef
  };
}
