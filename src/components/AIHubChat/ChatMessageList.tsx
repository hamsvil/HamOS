 
import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Sparkles, X, Loader2, ExternalLink, Video, Mic, FileText, ImageIcon, ChevronRight, AlertCircle, RefreshCw, Activity, BrainCircuit } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../types/ai';
import { CLONES } from '../../constants/aiClones';
import { CodeBlock } from './CodeBlock';
import { useSmoothStream } from '../../hooks/useSmoothStream';
import { registerBlobUrl } from '../../utils/blobRegistry';
import { useAIHubStore } from '../../store/aiHubStore';

interface SmoothMarkdownProps {
  content: string;
  isStreaming: boolean;
  isLoading: boolean;
  onShellExecute: (cmd: string) => void;
}

const SmoothMarkdown: React.FC<SmoothMarkdownProps> = memo(({ content, isStreaming, isLoading, onShellExecute }) => {
  const displayedContent = useSmoothStream(content, isStreaming);
  const onShellExecuteRef = React.useRef(onShellExecute);

  // Optimized thought extraction using string manipulation
  const extractThought = (text: string) => {
    const startTag = '<thought>';
    const endTag = '</thought>';
    const startIndex = text.indexOf(startTag);
    if (startIndex === -1) return { thought: null, cleanContent: text };
    
    const endIndex = text.indexOf(endTag, startIndex + startTag.length);
    if (endIndex === -1) {
        // Unclosed thought, treat the rest as thought
        return { 
            thought: text.substring(startIndex + startTag.length), 
            cleanContent: text.substring(0, startIndex) 
        };
    }
    
    return {
        thought: text.substring(startIndex + startTag.length, endIndex),
        cleanContent: text.substring(0, startIndex) + text.substring(endIndex + endTag.length)
    };
  };

  const { thought, cleanContent } = extractThought(displayedContent);

  React.useEffect(() => {
    onShellExecuteRef.current = onShellExecute;
  }, [onShellExecute]);

  const markdownComponents: Components = React.useMemo(() => ({
    code({ _node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const value = String(children).replace(/\n$/, '');
      
      if (!inline && language) {
        return (
          <CodeBlock 
            language={language} 
            value={value} 
            onExecute={(cmd) => onShellExecuteRef.current(cmd)}
          />
        );
      }
      return <code className={`bg-zinc-800/50 px-1.5 py-0.5 rounded text-emerald-400 font-mono text-[0.9em] ${className}`} {...props}>{children}</code>;
    },
    p: ({ children }: any) => <p className="mb-4 last:mb-0 text-zinc-200/90 leading-relaxed">{children}</p>,
    a: ({ href, children }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 hover:underline decoration-emerald-400/30 underline-offset-4 transition-colors">
        {children}
      </a>
    ),
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-zinc-400/80">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-zinc-400/80">{children}</ol>,
    h1: ({ children }: any) => <h1 className="text-xl font-bold text-zinc-100 mb-4 mt-6 border-b border-zinc-800 pb-2 tracking-tight">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg font-bold text-zinc-100 mb-3 mt-5 tracking-tight">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-md font-bold text-zinc-100 mb-2 mt-4 tracking-tight">{children}</h3>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-emerald-500/30 pl-4 italic text-zinc-400/60 my-4 bg-zinc-900/30 py-1 rounded-r-lg">
        {children}
      </blockquote>
    ),
     
    details: ({children}: any) => (
      <details className="group border border-zinc-800 rounded-lg my-2 bg-zinc-900/50 overflow-hidden transition-all">
        {children}
      </details>
    ),
     
    summary: ({children}: any) => (
      <summary className="px-4 py-2 cursor-pointer font-bold text-xs uppercase tracking-widest text-emerald-400 hover:bg-zinc-800/50 list-none flex items-center gap-2 transition-colors">
        <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
        {children}
      </summary>
    ),
  }), []);

  const markdownContent = React.useMemo(() => {
    try {
      return (
        <div className="space-y-4">
          {thought && (
            <details className="group border border-zinc-800/50 rounded-xl bg-zinc-900/30 overflow-hidden transition-all">
              <summary className="px-4 py-2.5 cursor-pointer font-bold text-[9px] uppercase tracking-[0.2em] text-emerald-400/60 hover:bg-zinc-800/30 list-none flex items-center gap-2 transition-colors">
                <div className="relative w-3 h-3 flex items-center justify-center">
                  <BrainCircuit size={10} className="text-emerald-400 group-open:animate-pulse" />
                  <div className="absolute inset-0 animate-ping bg-emerald-400/10 rounded-full" />
                </div>
                <span>Neural Reasoning Process</span>
                <ChevronRight size={10} className="ml-auto group-open:rotate-90 transition-transform opacity-40" />
              </summary>
              <div className="px-4 pb-4 pt-2 text-[11px] leading-relaxed text-zinc-500 font-mono italic whitespace-pre-wrap border-t border-zinc-800/30">
                {thought}
              </div>
            </details>
          )}
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {cleanContent}
          </ReactMarkdown>
        </div>
      );
    } catch (err) {
      console.error('[Anti-BlankScreen] Markdown render failed, falling back to raw text:', err);
      return (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-xs font-mono whitespace-pre-wrap text-zinc-400">
          <div className="flex items-center gap-2 text-red-400 mb-2 uppercase tracking-widest font-black text-[9px]">
            <AlertCircle size={12} />
            <span>Render Recovery Active</span>
          </div>
          {cleanContent}
        </div>
      );
    }
  }, [cleanContent, thought, markdownComponents]);

  if (content === '...' && isLoading) {
    return (
      <div className="flex flex-col gap-4 py-2">
        <div className="flex items-center gap-3 text-emerald-400/50">
          <div className="relative">
            <Loader2 size={16} className="animate-spin text-emerald-400" />
            <div className="absolute inset-0 animate-ping bg-emerald-400/20 rounded-full" />
          </div>
          <span className="text-[10px] font-black tracking-[0.2em] uppercase animate-pulse">Neural Synthesis Active...</span>
        </div>
        <div className="space-y-2 opacity-30">
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
            />
          </div>
          <div className="h-2 w-[80%] bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
              className="h-full w-1/4 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
            />
          </div>
        </div>
      </div>
    );
  }

  return markdownContent;
});
SmoothMarkdown.displayName = 'SmoothMarkdown';

const MessageSkeleton = () => (
  <div className="flex justify-start w-full">
    <div className="max-w-[80%] w-full bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 opacity-20">
        <div className="w-3 h-3 bg-zinc-700 rounded-full animate-pulse" />
        <div className="w-20 h-2 bg-zinc-700 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="w-full h-3 bg-zinc-800/50 rounded animate-pulse" />
        <div className="w-[90%] h-3 bg-zinc-800/50 rounded animate-pulse" />
        <div className="w-[70%] h-3 bg-zinc-800/50 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

interface ChatMessageItemProps {
  msg: ChatMessage;
  isStreaming: boolean;
  isLoading: boolean;
  activeClone: typeof CLONES[0];
  onShellExecute: (cmd: string) => void;
}

const ChatMessageItem = memo(({ msg, isStreaming, isLoading, activeClone, onShellExecute }: ChatMessageItemProps) => {
  React.useEffect(() => {
    if (msg.image && msg.image.startsWith('blob:')) {
      registerBlobUrl(msg.image);
    }
    if (msg.audio && msg.audio.startsWith('blob:')) {
      registerBlobUrl(msg.audio);
    }
    if (msg.video && msg.video.startsWith('blob:')) {
      registerBlobUrl(msg.video);
    }
  }, [msg.image, msg.audio, msg.video]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-4 shadow-2xl transition-all ${
        msg.role === 'user' 
          ? 'bg-emerald-500/10 text-zinc-100 border border-emerald-500/20 backdrop-blur-md' 
          : 'bg-zinc-900/60 text-zinc-100 border border-zinc-800/50 backdrop-blur-md'
      }`}>
        {msg.role === 'ai' && (
          <div className="flex items-center gap-2 mb-2.5 opacity-40">
            <activeClone.icon size={12} className="text-emerald-400" />
            <span className="text-[9px] font-black tracking-[0.2em] uppercase">{activeClone.name}</span>
          </div>
        )}

        {msg.image && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group mb-4 overflow-hidden rounded-xl border border-zinc-800 shadow-2xl"
          >
            <img src={msg.image} alt="Generated" className="max-w-full transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <button 
              onClick={() => window.open(msg.image, '_blank')}
              className="absolute bottom-3 right-3 p-2 bg-zinc-900/80 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-zinc-400 hover:text-emerald-400 border border-zinc-700"
            >
              <ExternalLink size={16} />
            </button>
          </motion.div>
        )}
        
        {msg.audio && <audio controls src={msg.audio} className="mb-4 w-full h-10 rounded-lg filter invert opacity-80" preload="none" />}
        {msg.video && <video controls src={msg.video} className="rounded-xl mb-4 max-w-full border border-zinc-800 shadow-2xl" preload="none" />}
        
        {msg.files && msg.files.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {msg.files.map((f, fi) => (
              <div key={fi} className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/50 hover:bg-zinc-800/50 transition-all group cursor-pointer">
                <div className="w-10 h-10 bg-zinc-900/60 flex items-center justify-center rounded-lg border border-zinc-700 shrink-0 group-hover:border-emerald-500/30 transition-colors">
                  {f.mimeType.startsWith('image/') ? (
                    <ImageIcon size={18} className="text-blue-400" />
                  ) : f.mimeType.startsWith('video/') ? (
                    <Video size={18} className="text-purple-400" />
                  ) : f.mimeType.startsWith('audio/') ? (
                    <Mic size={18} className="text-emerald-400" />
                  ) : (
                    <FileText size={18} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold truncate text-zinc-200 group-hover:text-emerald-400 transition-colors">{f.name}</div>
                  <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{f.mimeType.split('/')[1]}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="prose prose-invert prose-sm max-w-none leading-relaxed selection:bg-emerald-500/30">
          <SmoothMarkdown 
            content={msg.content} 
            isStreaming={isStreaming} 
            isLoading={isLoading} 
            onShellExecute={onShellExecute} 
          />
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isLoading === nextProps.isLoading
  );
});
ChatMessageItem.displayName = 'ChatMessageItem';

interface ChatMessageListProps {
  history: ChatMessage[];
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  isLoading: boolean;
  loadingProgress: { progress: number; text: string } | null;
  handleCancel: () => void;
  activeClone: typeof CLONES[0];
  onShellExecute: (cmd: string) => void;
  retryLastMessage: () => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  history,
  visibleCount,
  setVisibleCount,
  messagesEndRef,
  scrollToBottom,
  isLoading,
  loadingProgress,
  handleCancel,
  activeClone,
  onShellExecute,
  retryLastMessage
}) => {
  const { lastError, setLastError } = useAIHubStore();

  const historyArray = Array.isArray(history) ? history : [];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-8 pt-16 custom-scrollbar relative">
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-zinc-950 to-transparent pointer-events-none z-10" />
      
      {historyArray.length > visibleCount && (
        <div className="flex justify-center py-4">
          <button 
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="px-6 py-2 bg-zinc-900/50 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-emerald-400 rounded-full transition-all border border-zinc-800/50 hover:border-emerald-500/30"
          >
            Load Previous Messages ({historyArray.length - visibleCount} remaining)
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {historyArray.slice(-visibleCount).map((msg, i) => {
          const isLastMessage = i === historyArray.slice(-visibleCount).length - 1;
          const isStreaming = isLoading && isLastMessage && msg.role === 'ai';
          return (
            <ChatMessageItem
              key={msg.timestamp || i}
              msg={msg}
              isStreaming={isStreaming}
              isLoading={isLoading}
              activeClone={activeClone}
              onShellExecute={onShellExecute}
            />
          );
        })}
      </AnimatePresence>

      {isLoading && history[history.length - 1]?.role === 'user' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <MessageSkeleton />
        </motion.div>
      )}

      <div ref={messagesEndRef} className="h-4" />
      
      {/* Scroll to Bottom Button */}
      {history.length > 3 && (
         <button 
           onClick={() => scrollToBottom('smooth')}
           className="fixed bottom-24 right-10 p-3 bg-emerald-500/10 text-emerald-400 rounded-full hover:bg-emerald-500/20 transition-all opacity-0 group-hover:opacity-100 md:opacity-50 border border-emerald-500/30 backdrop-blur-xl z-50 hover:scale-110 active:scale-90"
           title="Scroll to Bottom"
         >
           <ArrowDown size={20} />
         </button>
      )}

      {isLoading && (
        <div className="flex justify-start items-center gap-4 sticky bottom-0 py-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent z-20">
          <div className="bg-zinc-900/80 backdrop-blur-xl text-zinc-100 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 min-w-[240px] shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="animate-spin text-emerald-400" size={16} />
                <div className="absolute inset-0 animate-ping bg-emerald-400/20 rounded-full" />
              </div>
              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase animate-pulse">
                {loadingProgress ? loadingProgress.text : 'Neural Synthesis...'}
              </span>
            </div>
            {loadingProgress && (
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress.progress}%` }}
                  className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                />
              </div>
            )}
          </div>
          <button 
            type="button"
            onClick={handleCancel}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 group shadow-xl"
          >
            <X size={16} className="group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black tracking-widest uppercase pr-2">Abort</span>
          </button>
        </div>
      )}

      {lastError && !isLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mx-auto max-w-md p-5 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-[11px] font-black text-red-400 uppercase tracking-[0.2em]">Neural Link Failure</h4>
              <p className="text-[12px] text-red-300/60 mt-2 font-mono leading-relaxed">{lastError}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={retryLastMessage}
              className="flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
              Retry Sequence
            </button>
            <button
              onClick={() => setLastError(null)}
              className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-transparent hover:bg-white/5 text-zinc-500 border border-zinc-800 rounded-xl transition-all"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
      <div ref={messagesEndRef} className="h-10" />
    </div>
  );
};
