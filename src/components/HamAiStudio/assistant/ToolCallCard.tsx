import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { ToolCall } from './assistantTypes';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

const ToolCallCard = ({ toolCall }: ToolCallCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'running': return <Clock size={14} className="text-blue-400 animate-spin" />;
      case 'success': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'error': return <AlertCircle size={14} className="text-red-500" />;
    }
  };

  return (
    <div className="my-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]/30 overflow-hidden transition-all duration-200">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-secondary)]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {toolCall.status === 'running' ? 'Calling' : toolCall.status === 'success' ? 'Called' : 'Error calling'} {toolCall.name}...
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 animate-in slide-in-from-top-1 duration-200">
          <div className="space-y-2">
            <div>
              <div className="text-[10px] font-semibold text-[var(--text-secondary)] mb-1">INPUT</div>
              <pre className="p-2 bg-black/20 rounded text-[11px] font-mono text-[var(--text-primary)] overflow-x-auto">
                {JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>
            {(toolCall.result || toolCall.error) && (
              <div>
                <div className="text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                  {toolCall.error ? 'ERROR' : 'OUTPUT'}
                </div>
                <pre className={`p-2 rounded text-[11px] font-mono overflow-x-auto max-h-[150px] ${toolCall.error ? 'bg-red-500/5 text-red-400' : 'bg-black/20 text-[var(--text-secondary)]'}`}>
                  {toolCall.error || toolCall.result}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolCallCard;
