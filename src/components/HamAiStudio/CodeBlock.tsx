 
import * as React from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Code, Terminal, WrapText } from 'lucide-react';
import * as prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-bash';
import { useToast } from '../../context/ToastContext';

interface CodeBlockProps {
  language: string;
  value: string;
}

export default function CodeBlock({ language, value }: CodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isWrapped, setIsWrapped] = React.useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      showToast('Code copied to clipboard', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_err) {
      // console.error('Failed to copy code:', err);
      showToast('Failed to copy code', 'error');
    }
  };

  const isTerminal = ['shell', 'bash', 'sh', 'zsh', 'console', 'terminal', 'cmd', 'powershell'].includes(language?.toLowerCase());

  const highlightedCode = React.useMemo(() => {
    try {
      const lang = language || 'markup';
      const grammar = prism.languages[lang] || prism.languages.markup;
      return prism.highlight(value, grammar, lang);
    } catch (_e) {
      return value;
    }
  }, [language, value]);

  if (isTerminal) {
    return (
      <div className="my-4 rounded-lg border border-white/10 bg-[#1e1e1e] overflow-hidden shadow-lg font-mono text-xs group">
        <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <div className="flex items-center gap-1.5 text-white/40">
              <Terminal size={12} />
              <span className="text-[10px] font-medium uppercase tracking-wider">Terminal Output</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
                onClick={() => setIsWrapped(!isWrapped)}
                className={`p-1.5 rounded transition-all opacity-0 group-hover:opacity-100 ${isWrapped ? 'text-blue-400 bg-blue-500/10' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                title="Toggle Wrap"
            >
                <WrapText size={12} />
            </button>
            <button 
                onClick={handleCopy}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                title="Copy Output"
            >
                {isCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <div className="p-3 overflow-x-auto custom-scrollbar bg-[#1e1e1e]">
          <pre className={`text-green-400 leading-relaxed font-mono text-[11px] ${isWrapped ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
            {value}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-lg border border-[var(--border-color)] bg-[#09090b] overflow-hidden shadow-sm group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#18181b] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Code size={12} className="text-zinc-400" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{language || 'code'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsWrapped(!isWrapped)}
            className={`p-1 rounded transition-all ${isWrapped ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
            title="Toggle Wrap"
          >
            <WrapText size={12} />
          </button>
          <button 
            onClick={handleCopy}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            title="Copy Code"
          >
            {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-3 overflow-x-auto custom-scrollbar">
          <pre className={`text-[12px] leading-relaxed font-mono text-zinc-100 ${isWrapped ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
            <code 
              className={`language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </pre>
        </div>
      )}
    </div>
  );
}
