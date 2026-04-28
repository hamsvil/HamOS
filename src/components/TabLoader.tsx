 
import React from 'react';

export const TabLoader = () => (
  <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-secondary)]/30 gap-3">
    <div className="w-8 h-8 border-2 border-[#00ffcc] border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-mono tracking-widest uppercase">Initializing Module...</span>
  </div>
);
