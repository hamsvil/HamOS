import React from 'react';

export const LogLevelLegend: React.FC = () => {
  const levels = [
    { name: 'DEBUG', color: 'bg-gray-400' },
    { name: 'INFO', color: 'bg-blue-400' },
    { name: 'WARN', color: 'bg-yellow-400' },
    { name: 'ERROR', color: 'bg-red-400' },
    { name: 'FATAL', color: 'bg-red-600' },
  ];

  return (
    <div className="flex items-center gap-3 px-2 py-1 bg-[var(--bg-secondary)]/30 rounded-md border border-white/5">
      <span className="text-[10px] text-muted-foreground uppercase font-bold mr-1">Legend:</span>
      {levels.map(level => (
        <div key={level.name} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${level.color}`} />
          <span className="text-[10px] text-gray-400">{level.name}</span>
        </div>
      ))}
    </div>
  );
};
