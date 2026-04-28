 
import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Bot, User, Copy, Video, Mic, FileText, Image as ImageIcon, Download, ChevronUp, ChevronDown, Volume2, Info, ExternalLink } from 'lucide-react';
import { ChatMessage } from '../../../types/ai';
import { useSmoothStream } from '../../../hooks/useSmoothStream';
import { Citation, CitationSource } from '../Citation';
import 'katex/dist/katex.min.css';

interface SmoothMarkdownProps {
  content: string;
  isStreaming: boolean;
  copyToClipboard: (text: string) => void;
  citations?: CitationSource[];
}

const SmoothMarkdown: React.FC<SmoothMarkdownProps> = React.memo(({ content, isStreaming, copyToClipboard, citations }) => {
  const displayedContent = useSmoothStream(content, isStreaming);
  const copyToClipboardRef = useRef(copyToClipboard);

  useEffect(() => {
    copyToClipboardRef.current = copyToClipboard;
  }, [copyToClipboard]);

  // Pre-process content to handle citations if they exist
  const processedContent = useMemo(() => {
    if (!citations || citations.length === 0) return displayedContent;
    
    // Replace [citation:id] with <cite-ref id="id" />
    return displayedContent.replace(/\[citation:([a-zA-Z0-9_-]+)\]/g, (match, id) => {
      return `<cite-ref id="${id}"></cite-ref>`;
    });
  }, [displayedContent, citations]);

  const markdownComponents = useMemo(() => ({
     
    code({_node, inline, className, children, ...props}: any) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <div className="relative group bg-black/30 rounded-md p-2 my-2 border border-white/5">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button 
              onClick={() => copyToClipboardRef.current(String(children))}
              className="p-1.5 bg-gray-800/80 backdrop-blur-sm rounded-lg text-white hover:bg-gray-700 border border-white/10"
              title="Copy Code"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="text-[10px] text-white/40 mb-1 px-2 font-mono uppercase tracking-widest">{match[1]}</div>
          <pre className="overflow-x-auto p-2 custom-scrollbar">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className={`${className} bg-white/10 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs`} {...props}>
          {children}
        </code>
      )
    },
    // Custom component for citations
    'cite-ref': (props: any) => {
      const id = props.id;
      const sourceIndex = citations?.findIndex(s => s.id === id);
      const source = citations?.find(s => s.id === id);
      
      if (source && sourceIndex !== undefined) {
        return <Citation source={source} index={sourceIndex + 1} />;
      }
      return <span className="text-red-400 text-[10px]">[Ref Error: {id}]</span>;
    },
    // Better styling for other elements
    h1: ({children}: any) => <h1 className="text-xl font-bold mb-4 text-white border-b border-white/10 pb-2">{children}</h1>,
    h2: ({children}: any) => <h2 className="text-lg font-bold mb-3 text-white/90">{children}</h2>,
    h3: ({children}: any) => <h3 className="text-md font-bold mb-2 text-white/80">{children}</h3>,
    p: ({children}: any) => <p className="mb-4 leading-relaxed last:mb-0">{children}</p>,
    ul: ({children}: any) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
    ol: ({children}: any) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
    li: ({children}: any) => <li className="text-white/80">{children}</li>,
    blockquote: ({children}: any) => (
      <blockquote className="border-l-4 border-blue-500/50 bg-blue-500/5 pl-4 py-2 my-4 italic rounded-r-lg">
        {children}
      </blockquote>
    ),
    table: ({children}: any) => (
      <div className="overflow-x-auto mb-4 rounded-lg border border-white/10">
        <table className="w-full text-left border-collapse">{children}</table>
      </div>
    ),
    th: ({children}: any) => <th className="bg-white/5 p-2 border-b border-white/10 font-bold">{children}</th>,
    td: ({children}: any) => <td className="p-2 border-b border-white/5">{children}</td>,
  }), [citations]);

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm, remarkMath]} 
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={markdownComponents as any}
    >
      {processedContent}
    </ReactMarkdown>
  );
});
SmoothMarkdown.displayName = 'SmoothMarkdown';

const MediaContainer: React.FC<{ type: 'image' | 'audio' | 'video' | 'music', src: string, title?: string }> = ({ type, src, title }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `ham_engine_${type}_${Date.now()}.${type === 'image' ? 'png' : type === 'video' ? 'mp4' : 'mp3'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="border border-white/20 rounded-lg overflow-hidden mb-3 bg-black/40 w-full max-w-md">
      <div className="flex justify-between items-center p-2 bg-black/60 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
          {type === 'image' && <ImageIcon size={14} />}
          {type === 'video' && <Video size={14} />}
          {(type === 'audio' || type === 'music') && <Volume2 size={14} />}
          <span>{title || `Rendered ${type.charAt(0).toUpperCase() + type.slice(1)}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-1 hover:bg-white/20 rounded text-white/70" title="Download">
            <Download size={14} />
          </button>
          <button className="p-1 hover:bg-white/20 rounded text-white/70">
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="p-2 flex justify-center bg-black/20">
          {type === 'image' && <img src={src} alt="Generated" className="max-w-full rounded" referrerPolicy="no-referrer" />}
          {type === 'video' && <video controls src={src} className="max-w-full rounded" />}
          {(type === 'audio' || type === 'music') && (
            <div className="w-full">
              {type === 'music' && (
                <div className="flex items-center justify-center h-24 mb-2 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded border border-white/10 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-full h-full flex items-center justify-around px-4">
                       {[...Array(15)].map((_, i) => (
                         <div key={i} className="w-2 bg-purple-500 rounded-t-sm animate-pulse" style={{ height: `${Math.random() * 80 + 20}%`, animationDelay: `${i * 100}ms` }} />
                       ))}
                    </div>
                  </div>
                  <Volume2 size={32} className="text-white/50 z-10" />
                </div>
              )}
              <audio controls src={src} className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface AIHubMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export const AIHubMessageList: React.FC<AIHubMessageListProps> = ({ messages, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent">
      {messages.map((msg, idx) => {
        const isMusic = msg.content.includes('Musik berhasil di-generate');
        return (
        <div 
          key={msg.timestamp || idx} 
          className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
          }`}>
            {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
          </div>
          
          <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-none'
            }`}>
              {msg.image && <MediaContainer type="image" src={msg.image} />}
              {msg.audio && <MediaContainer type={isMusic ? 'music' : 'audio'} src={msg.audio} title={isMusic ? 'Music Player (Lyria Engine)' : 'Voice Audio'} />}
              {msg.video && <MediaContainer type="video" src={msg.video} />}
              
              {msg.files && msg.files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.files.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2 bg-black/20 p-2 rounded text-xs">
                      {f.mimeType.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                      <span className="truncate max-w-[100px]">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="markdown-body text-sm">
                  <SmoothMarkdown 
                    content={msg.content} 
                    isStreaming={isLoading && idx === messages.length - 1} 
                    copyToClipboard={copyToClipboard} 
                    citations={msg.citations}
                  />
                  
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        <Info size={12} />
                        <span>Sources & References</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citations.map((source, sIdx) => (
                          <a 
                            key={source.id}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                          >
                            <div className="w-5 h-5 flex items-center justify-center rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold group-hover:bg-blue-500 group-hover:text-white transition-colors">
                              {sIdx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-medium text-white/80 truncate">{source.title}</div>
                              {source.url && <div className="text-[8px] text-white/40 truncate">{new URL(source.url).hostname}</div>}
                            </div>
                            <ExternalLink size={10} className="text-white/20 group-hover:text-white/60" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-[10px] text-[var(--text-secondary)] mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )})}
      
      {isLoading && (
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
            <Bot size={16} className="text-white" />
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
};
