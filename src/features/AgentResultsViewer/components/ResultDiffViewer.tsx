import React from 'react';
import { AgentResult } from '../../../services/agentObservability/AgentObservabilityService';

interface ResultDiffViewerProps {
  results: AgentResult[];
  onClose: () => void;
}

export const ResultDiffViewer: React.FC<ResultDiffViewerProps> = ({ results, onClose }) => {
  if (results.length < 2) return null;
  
  const r1 = results[0];
  const r2 = results[1];

  // A very simple word-based diff simulation
  const diffTexts = (text1: string, text2: string) => {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    return { words1, words2 };
  };

  const { words1, words2 } = diffTexts(r1.result, r2.result);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] border border-primary/30 rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40">
        <h3 className="text-sm font-bold uppercase">Artifact Diff Viewer</h3>
        <button onClick={onClose} className="text-xs hover:text-primary underline">Close Diff</button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
          <div className="p-2 text-[10px] bg-red-500/10 text-red-400 font-bold border-b border-red-500/20">
            OLD: {r1.agentName} - {new Date(r1.timestamp).toLocaleTimeString()}
          </div>
          <div className="flex-1 overflow-auto p-4 font-mono text-xs whitespace-pre-wrap">
            {r1.result}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2 text-[10px] bg-green-500/10 text-green-400 font-bold border-b border-green-500/20">
            NEW: {r2.agentName} - {new Date(r2.timestamp).toLocaleTimeString()}
          </div>
          <div className="flex-1 overflow-auto p-4 font-mono text-xs whitespace-pre-wrap">
            {r2.result}
          </div>
        </div>
      </div>
      <div className="p-2 text-[10px] text-center text-muted-foreground border-t border-white/5 bg-black/20">
        Comparing {r1.task} vs {r2.task}
      </div>
    </div>
  );
};
