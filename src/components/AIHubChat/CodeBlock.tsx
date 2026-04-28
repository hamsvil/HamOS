 
import React, { useState } from 'react';
import { Terminal as TerminalIcon, Play, Check, Copy, ChevronUp, ChevronDown } from 'lucide-react';

export const CodeBlock = ({ language, value, onExecute }: { language: string; value: string; onExecute?: (cmd: string) => void }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Expanded by default to prevent height jumps during streaming
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isTerminal = ['shell', 'bash', 'sh', 'zsh', 'console'].includes(language?.toLowerCase());

  if (isTerminal) {
    return (
      <div className="my-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] overflow-hidden shadow-lg font-mono text-xs group">
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]/40">
              <TerminalIcon size={12} />
              <span className="text-[10px] font-medium uppercase tracking-wider">Terminal Output</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExecute && (
                <button 
                  onClick={() => onExecute(value)}
                  className="p-1.5 text-[#00ffcc] hover:bg-[#00ffcc]/10 rounded-md transition-all flex items-center gap-1.5 text-[10px] font-mono opacity-0 group-hover:opacity-100"
                  title="Execute in Terminal"
                >
                  <Play size={12} />
                  <span className="hidden sm:inline">RUN</span>
                </button>
            )}
            <button 
                onClick={copyToClipboard}
                className="p-1.5 rounded text-[var(--text-secondary)]/40 hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all opacity-0 group-hover:opacity-100"
                title="Copy Output"
            >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <div className="p-3 overflow-x-auto custom-scrollbar bg-[var(--bg-tertiary)]">
          <pre className="text-green-400 whitespace-pre-wrap break-all leading-relaxed font-mono text-[11px]">
            {value}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]/60 backdrop-blur-md shadow-2xl group transition-all duration-300 hover:border-[#00ffcc]/30">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-[#00ffcc]" />
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/50 uppercase tracking-widest">{language || 'code'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={copyToClipboard}
            className="p-1.5 text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-all"
            title="Copy Code"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-all"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      
      <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <pre className="p-4 text-xs font-mono text-[var(--text-primary)]/90 overflow-x-auto custom-scrollbar bg-[var(--bg-tertiary)]/40">
          <code>{value}</code>
        </pre>
      </div>
      
      {!isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          className="px-4 py-3 text-[10px] text-[#00ffcc]/60 hover:text-[#00ffcc] cursor-pointer text-center font-mono tracking-widest bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)] transition-all uppercase"
        >
          Buka Kontainer Kode ({value.split('\n').length} Baris)
        </div>
      )}
    </div>
  );
};
