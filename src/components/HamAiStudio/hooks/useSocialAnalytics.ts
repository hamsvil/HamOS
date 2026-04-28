import { useState, useEffect } from 'react';

export const useSocialAnalytics = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social-worker/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Fetch stats failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refresh: fetchStats };
};
