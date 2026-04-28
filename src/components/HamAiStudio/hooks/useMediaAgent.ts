import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaPost, Trend } from '../../../types/mediaAgent';

export const useMediaAgent = () => {
  const [queue, setQueue] = useState<MediaPost[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const [qRes, tRes] = await Promise.all([
        fetch('/api/media-agent/queue', { signal: abortControllerRef.current.signal }),
        fetch('/api/media-agent/trends', { signal: abortControllerRef.current.signal })
      ]);
      
      if (!qRes.ok || !tRes.ok) {
        const qErr = !qRes.ok ? await qRes.json().catch(() => ({})) : {};
        const tErr = !tRes.ok ? await tRes.json().catch(() => ({})) : {};
        throw new Error(qErr.error || tErr.error || 'Failed to fetch media agent data');
      }
      
      setQueue(await qRes.json());
      setTrends(await tRes.json());
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToQueue = async (content: string, platform: string = 'all', schedule: string = 'now') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/media-agent/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, platform, schedule })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to add post to queue');
      }
      await fetchData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { queue, trends, loading, error, addToQueue, refresh: fetchData };
};
