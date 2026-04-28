import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

interface SummaryOfChangesProps {
  changes: string[];
}

const SummaryOfChanges = ({ changes }: SummaryOfChangesProps) => {
  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <div className="bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">
          <FileText size={14} />
          Summary of Changes
        </div>
        <ul className="space-y-2">
          {changes.map((change, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
              <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
              <span>{change}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SummaryOfChanges;
