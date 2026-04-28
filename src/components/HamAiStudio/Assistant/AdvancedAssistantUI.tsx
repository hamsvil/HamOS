 
import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, AlertTriangle, CheckCircle2, 
  Loader2, ChevronRight, ChevronDown, Sparkles
} from 'lucide-react';
import { AgentActivity, ProjectFile } from '../types';
import { NeuralContextService, AntiPattern } from '../../../services/aiHub/core/NeuralContextService';

interface AdvancedAssistantUIProps {
  activities: AgentActivity[];
  selectedFile?: ProjectFile | null;
  isBuildDisabled?: boolean;
  buildError?: string | null;
}

export const AdvancedAssistantUI: React.FC<AdvancedAssistantUIProps> = ({ 
  activities, 
  selectedFile,
  isBuildDisabled,
  buildError
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [antiPatterns, setAntiPatterns] = useState<AntiPattern[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const patterns = NeuralContextService.analyzeFile(selectedFile);
      setAntiPatterns(patterns);
    } else {
      setAntiPatterns([]);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities, isExpanded]);

  if (hasError) {
    return null; // Fail silently/invisibly as requested
  }

  try {
    if (!activities || activities.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-1 p-2 rounded-lg border border-zinc-800 bg-zinc-900/50">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-[10px] font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors px-1 py-1"
        >
          <div className="flex items-center gap-2">
            <Activity size={12} />
            <span>Execution Log ({activities.length})</span>
          </div>
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        
        {isExpanded && (
          <div className="flex flex-col gap-2 mt-1">
            {/* Build Guard Status */}
            {isBuildDisabled && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 animate-pulse">
                <AlertTriangle size={12} />
                <div className="flex flex-col">
                  <span className="font-bold uppercase tracking-wider">Predictive Build Guard Active</span>
                  <span className="opacity-80">{buildError}</span>
                </div>
              </div>
            )}

            {/* Anti-Pattern Detection */}
            {antiPatterns.length > 0 && (
              <div className="flex flex-col gap-1 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                <div className="flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  <Sparkles size={12} />
                  <span>Neural Anti-Pattern Detection ({antiPatterns.length})</span>
                </div>
                <div className="flex flex-col gap-1 mt-1 max-h-[60px] overflow-y-auto scrollbar-none">
                  {antiPatterns.map((pattern, i) => (
                    <div key={i} className="text-[9px] text-amber-300/80 border-l border-amber-500/30 pl-2">
                      <span className="font-bold">Line {pattern.line}:</span> {pattern.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={scrollRef} className="flex flex-col gap-1 max-h-[90px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            {activities.map((activity, index) => (
              <div key={index} className="group animate-in fade-in slide-in-from-left-1 duration-200">
                <details className="group/details bg-zinc-900 border border-zinc-800/80 rounded overflow-hidden open:bg-zinc-800/50 transition-colors">
                  <summary className="flex items-center gap-2 p-1.5 cursor-pointer list-none hover:bg-zinc-800/80 transition-colors">
                    <div className={`shrink-0 flex items-center justify-center w-4 h-4 rounded-full border text-[9px] font-mono ${
                      activity.status === 'running' ? 'border-blue-500/50 text-blue-400' :
                      activity.status === 'error' ? 'border-red-500/50 text-red-400' :
                      activity.status === 'success' ? 'border-emerald-500/50 text-emerald-400' :
                      'border-zinc-700 text-zinc-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-medium text-[11px] text-zinc-300 truncate">
                        {activity.title || 'Processing...'}
                      </span>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider px-1 rounded border border-zinc-800 bg-zinc-900">
                        {activity.type}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {activity.status === 'running' && <Loader2 size={10} className="animate-spin text-blue-400" />}
                      {activity.status === 'completed' && <CheckCircle2 size={10} className="text-zinc-500" />}
                      {activity.status === 'success' && <CheckCircle2 size={10} className="text-emerald-400" />}
                      {activity.status === 'error' && <AlertTriangle size={10} className="text-red-400" />}
                      {activity.status === 'warning' && <AlertTriangle size={10} className="text-amber-400" />}
                    </div>
                  </summary>
                  
                  <div className="p-2 pt-0 border-t border-zinc-800/50 mt-1 mx-2 text-[10px] font-mono text-zinc-400 whitespace-pre-wrap break-words leading-tight">
                    {activity.details || 'No details provided.'}
                  </div>
                </details>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    );
  } catch (_e) {
    setHasError(true);
    return null;
  }
};
