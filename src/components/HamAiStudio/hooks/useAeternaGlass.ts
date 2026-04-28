import { useState, useCallback, useEffect, useRef } from 'react';
import { AeternaGlassService, AeternaStatus } from '../../../services/aeterna/AeternaGlassService';

export const useAeternaGlass = () => {
  const [status, setStatus] = useState<AeternaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshStatus = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Note: AeternaGlassService uses native fetch which doesn't support signal easily without changing the service method
      // We'll keep it simple for now as it's a small JSON poll
      const data = await AeternaGlassService.getStatus();
      setStatus(data);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message);
    }
  }, []);

  const sendCommand = async (command: string, secret: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AeternaGlassService.sendCommand(command, secret);
      await AeternaGlassService.logCommand(command);
      await refreshStatus();
      return res.id;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 10000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [refreshStatus]);

  return { status, loading, error, sendCommand, refreshStatus };
};
