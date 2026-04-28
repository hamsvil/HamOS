import { useState, useEffect, useCallback } from 'react';

export const useSocialScheduler = () => {
  const [schedules, setSchedules] = useState<any[]>([]);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch('/api/social-worker/schedule');
    const data = await res.json();
    setSchedules(data);
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const schedulePost = async (postId: string, time: string, platform: string) => {
    const res = await fetch('/api/social-worker/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, time, platform })
    });
    if (res.ok) fetchSchedules();
    return res.ok;
  };

  return { schedules, schedulePost, refresh: fetchSchedules };
};
