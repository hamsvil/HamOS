import React, { useState, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { ThumbsUp, ThumbsDown, Check, ImageOff, Trash2, Copy, AlertTriangle } from 'lucide-react';
import { ChatMessageData, ProjectData, AgentActivity, ProjectFile } from './types';
import CodeBlock from './CodeBlock';
import MultimodalContent from './MultimodalContent';
import { useSmoothStream } from '../../hooks/useSmoothStream';
import { AdvancedAssistantUI } from './Assistant/AdvancedAssistantUI';
import AssistantMessageBubble from './assistant/AssistantMessageBubble';
import LisaThinkingAnimation from './assistant/LisaThinkingAnimation';

interface ChatMessageProps {
  message: ChatMessageData;
  isLoading?: boolean;
  isStreaming?: boolean;
  activities?: ChatMessageData['activities'];
  timer?: number;
  progress?: number;
  _onCancel?: () => void;
  onFeedback?: (type: 'up' | 'down') => void;
  onRestore?: (project: ProjectData) => void;
  onViewChanges?: (project: ProjectData) => void;
  onFixError?: (errorMsg: string) => void;
  onIgnoreError?: (messageId: string) => void;
  isLast?: boolean;
  isBuildDisabled?: boolean;
  buildError?: string | null;
  selectedFile?: ProjectFile | null;
}

// Optimized Image Component with Error Handling
interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const SafeImage = ({ src, alt, ...props }: SafeImageProps) => {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
        <ImageOff size={20} className="mb-2" />
        <span>Failed to load image</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100px] flex items-center justify-center bg-black/20 rounded-lg my-2">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img 
        src={src} 
        alt={alt} 
        onError={() => { setError(true); setIsLoading(false); }}
        onLoad={() => setIsLoading(false)}
        referrerPolicy="no-referrer"
        loading="lazy"
        className={`rounded-lg max-w-full h-auto border border-white/10 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        {...props} 
      />
    </div>
  );
};

export default React.memo(function ChatMessage({ 
  message, isLoading, isStreaming, activities, timer, progress, 
  onFeedback, onRestore, onViewChanges, onFixError, onIgnoreError,
  isBuildDisabled, buildError, selectedFile
}: ChatMessageProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(message.feedback || null);
  const [isCopied, setIsCopied] = useState(false);
  const displayedContent = useSmoothStream(message.content, !!isStreaming);

  const handleCopyMessage = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (_err) {
      // Failed to copy
    }
  }, [message.content]);

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedbackGiven(type);
    if (onFeedback) {
        onFeedback(type);
    }
  };

  const markdownComponents = useMemo(() => ({
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const content = String(children).replace(/\n$/, '');
      
      if (!inline && match) {
        const firstLine = content.split('\n')[0];
        const commentMatch = firstLine?.match(/^(?:\/\/|#|<!--|\/\*)\s*([\w./-]+\.\w+)\s*(?:-->|\*\/)?$/i);
        
        if (commentMatch) {
          const filePath = commentMatch[1];
          const isDelete = firstLine.toUpperCase().includes('DELETE');
          
          return (
            <div className={`my-2 p-3 bg-[#1e1e1e] border ${isDelete ? 'border-red-500/20' : 'border-white/10'} rounded-lg flex items-center justify-between group hover:border-blue-500/30 transition-all`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${isDelete ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'} flex items-center justify-center border`}>
                  {isDelete ? <Trash2 size={14} className="text-red-500" /> : <Check size={14} className="text-green-500" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-200">{filePath.split('/').pop()}</span>
                  <span className="text-[10px] text-gray-500 font-mono">{filePath}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className={`text-[10px] ${isDelete ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'} font-medium uppercase tracking-wider px-2 py-1 rounded`}>
                   {isDelete ? 'Deleted' : 'Updated'}
                 </span>
              </div>
            </div>
          );
        }

        return <CodeBlock language={match[1]} value={content} />;
      }
      
      return <code className={`${className} bg-black/20 px-1 py-0.5 rounded text-red-300 font-mono text-[0.9em]`} {...props}>{children}</code>;
    },
    img: SafeImage,
    a({ href, children, ...props }: any) {
      const url = href || '';
      if (url.match(/\.(mp4|webm|ogg)$/i)) return <MultimodalContent type="video" url={url} />;
      if (url.match(/\.(mp3|wav|ogg)$/i)) return <MultimodalContent type="audio" url={url} />;
      return <a href={href} className="text-blue-400 hover:underline break-all" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },
    p: ({children}: any) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({children}: any) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
    ol: ({children}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
    li: ({children}: any) => <li className="pl-1">{children}</li>,
    blockquote: ({children}: any) => <blockquote className="border-l-4 border-blue-500/50 pl-4 italic text-gray-400 my-2 bg-blue-500/5 py-1 pr-2 rounded-r">{children}</blockquote>,
  }), []);

  return (
    <div className="mb-8">
      {isLoading ? (
        <div className="flex items-start gap-4 animate-in fade-in duration-500 mb-6">
          <LisaThinkingAnimation />
          <div className="flex-1 pt-2 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
                Lisa is thinking...
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10 shadow-sm">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Progress:</span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{progress}%</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-white/5 px-2 py-1 rounded-full border border-white/10 shadow-sm">{Math.floor(timer || 0)}s</span>
              </div>
            </div>
            <div className="bg-[var(--bg-secondary)]/50 border border-white/5 rounded-2xl p-4 shadow-xl">
               <AdvancedAssistantUI 
                 activities={activities || []} 
                 selectedFile={selectedFile}
                 isBuildDisabled={isBuildDisabled}
                 buildError={buildError}
               />
            </div>
          </div>
        </div>
      ) : message.role === 'user' ? (
        <div className="flex justify-end mb-6 group">
          <div className="bg-[var(--bg-secondary)] text-[var(--text-primary)] px-5 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm break-words border border-[var(--border-color)]">
            <ReactMarkdown 
              components={markdownComponents as any}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              remarkPlugins={[remarkGfm]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      ) : message.isError ? (
        <div className="flex items-start gap-3 mb-6 group animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 shrink-0 shadow-lg shadow-red-500/10 mt-1">
            <AlertTriangle size={14} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 shadow-xl">
              <h4 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={14} />
                Lisa encountered an error
              </h4>
              <div className="text-red-300/80 text-xs font-mono whitespace-pre-wrap break-words mb-5 bg-black/40 p-3 rounded-xl border border-red-500/10">
                {message.content}
              </div>
              <div className="flex items-center gap-3">
                {onFixError && (
                  <button 
                    onClick={() => onFixError(message.content)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-600/20"
                  >
                    Attempt Fix
                  </button>
                )}
                {onIgnoreError && (
                  <button 
                    onClick={() => onIgnoreError(message.id!)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/10"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <AssistantMessageBubble 
            content={displayedContent}
            isStreaming={!!isStreaming}
            onCopy={handleCopyMessage}
          />
          
          {message.projectSnapshot && (
            <div className="mt-4 border border-violet-500/20 rounded-2xl p-4 bg-violet-500/5 flex items-center justify-between backdrop-blur-md shadow-lg ml-11 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <Check size={16} className="text-green-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[var(--text-primary)] tracking-tight">Project Snapshot Created</span>
                    <span className="text-[10px] opacity-70">Version history updated</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  {onViewChanges && (
                    <button onClick={() => onViewChanges(message.projectSnapshot!)} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-[var(--text-primary)] border border-white/10 transition-all hover:border-violet-500/50">
                      Diff
                    </button>
                  )}
                  {onRestore && (
                    <button onClick={() => onRestore(message.projectSnapshot!)} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-violet-600 hover:bg-violet-500 text-white border border-violet-400/30 transition-all shadow-lg shadow-violet-600/20">
                      Restore
                    </button>
                  )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  if (nextProps.isStreaming) return false;
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.steps?.length === nextProps.message.steps?.length &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.timer === nextProps.timer &&
    prevProps.progress === nextProps.progress &&
    prevProps.activities?.length === nextProps.activities?.length
  );
});
