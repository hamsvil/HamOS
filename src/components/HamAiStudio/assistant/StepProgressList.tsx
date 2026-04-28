import React from 'react';
import { ListChecks } from 'lucide-react';
import { StepItem } from './assistantTypes';

interface StepProgressListProps {
  steps: StepItem[];
}

const StepProgressList = ({ steps }: StepProgressListProps) => {
  return (
    <div className="my-4 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2">
        <ListChecks size={12} />
        Execution Steps
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div 
            key={step.id} 
            className={`flex items-center gap-3 p-2 rounded-lg border transition-all duration-300 ${
              step.status === 'running' ? 'bg-violet-500/5 border-violet-500/20' : 
              step.status === 'success' ? 'bg-green-500/5 border-green-500/10' : 
              'bg-white/5 border-white/5 opacity-60'
            }`}
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
              step.status === 'running' ? 'bg-violet-500 text-white border-violet-400 animate-pulse' : 
              step.status === 'success' ? 'bg-green-500 text-white border-green-400' : 
              'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-white/10'
            }`}>
              {step.status === 'success' ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium ${step.status === 'running' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepProgressList;
