import { useState, useEffect } from 'react';
import { useSocialWorkerStore } from '../../../store/socialWorkerStore';

export const useSocialQueue = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social-worker/queue');
      const data = await res.json();
      setQueue(data);
    } catch (e) {
      console.error('Fetch queue failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const addToQueue = async (post: any) => {
    const res = await fetch('/api/social-worker/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    if (res.ok) fetchQueue();
    return res.ok;
  };

  return { queue, loading, fetchQueue, addToQueue };
};

import { useCallback } from 'react';
