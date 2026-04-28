import React from 'react';
import { AssistantStatus } from './assistantTypes';
import { Brain, Settings, Play, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: AssistantStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = {
    thinking: {
      label: 'Thinking',
      icon: <Brain size={12} />,
      className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    },
    planning: {
      label: 'Planning',
      icon: <Settings size={12} />,
      className: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
    },
    executing: {
      label: 'Executing',
      icon: <Play size={12} />,
      className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    done: {
      label: 'Done',
      icon: <CheckCircle2 size={12} />,
      className: 'bg-green-500/10 text-green-400 border-green-500/20'
    }
  };

  const { label, icon, className } = config[status];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${className}`}>
      <span className={status !== 'done' ? 'animate-pulse' : ''}>{icon}</span>
      {label}
    </div>
  );
};

export default StatusBadge;
