 
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const ClockDisplay = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
      <Clock size="0.8rem" className="text-[#00ffcc]" />
      <span className="font-mono text-[10px] font-bold text-[var(--text-primary)]/80">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
};
