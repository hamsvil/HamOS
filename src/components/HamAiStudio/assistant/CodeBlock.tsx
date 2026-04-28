import React, { useState } from 'react';
import { Copy, WrapText, Check } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  value: string;
}

const CodeBlock = ({ language = 'text', value }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 border border-white/10 rounded-lg overflow-hidden bg-[#0a0a0a] group shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold font-sans text-[var(--text-secondary)] uppercase tracking-tight">{language}</span>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded transition-colors font-medium"
          >
            {copied ? (
              <><Check size={12} className="text-green-400" /> Copied</>
            ) : (
              <><Copy size={12} /> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <div className={`p-4 overflow-x-auto font-mono text-[13px] leading-relaxed ${wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
        <code className="text-gray-300">
          {value}
        </code>
      </div>
    </div>
  );
};

export default CodeBlock;
