import React from 'react';

interface ActionPillProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const ActionPill = ({ icon, label, active = true }: ActionPillProps) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-[var(--bg-tertiary)]/30 text-xs font-medium text-[var(--text-secondary)] group transition-all duration-300 hover:border-violet-500/30 hover:bg-violet-500/5 ${active ? 'animate-in fade-in slide-in-from-left-2' : ''}`}>
      <div className={`text-violet-400 ${active ? 'animate-pulse' : ''}`}>
        {icon}
      </div>
      <span className="relative overflow-hidden">
        {label}
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        )}
      </span>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};

export default ActionPill;
