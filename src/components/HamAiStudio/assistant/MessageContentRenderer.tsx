import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';
import ToolCallCard from './ToolCallCard';
import FileEditCard from './FileEditCard';
import CalloutBox from './CalloutBox';
import ActionPill from './ActionPill';
import StreamingCursor from './StreamingCursor';
import { AssistantEvent } from './assistantTypes';
import { Search, Terminal } from 'lucide-react';

interface MessageContentRendererProps {
  content: string;
  isStreaming: boolean;
  events?: AssistantEvent[];
}

const MessageContentRenderer = ({ content, isStreaming }: MessageContentRendererProps) => {
  const markdownComponents = useMemo(() => ({
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const val = String(children).replace(/\n$/, '');
      
      if (!inline && match) {
        return <CodeBlock language={match[1]} value={val} />;
      }
      return <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs" {...props}>{children}</code>;
    },
    blockquote({ children }: any) {
      return <CalloutBox type="info">{children}</CalloutBox>;
    },
    a({ href, children }: any) {
      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 underline-offset-4 transition-colors">{children}</a>;
    },
    p: ({children}: any) => <p className="mb-4 last:mb-0 leading-relaxed text-[var(--text-primary)]">{children}</p>,
    ul: ({children}: any) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
    ol: ({children}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>,
    li: ({children}: any) => <li className="pl-1 text-[var(--text-primary)]">{children}</li>,
    h1: ({children}: any) => <h1 className="text-xl font-bold mb-4 mt-8 text-[var(--text-primary)]">{children}</h1>,
    h2: ({children}: any) => <h2 className="text-lg font-bold mb-3 mt-6 text-[var(--text-primary)]">{children}</h2>,
    h3: ({children}: any) => <h3 className="text-base font-bold mb-2 mt-4 text-[var(--text-primary)]">{children}</h3>,
    table: ({children}: any) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="min-w-full divide-y divide-white/10">{children}</table>
      </div>
    ),
    th: ({children}: any) => <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest bg-white/5">{children}</th>,
    td: ({children}: any) => <td className="px-4 py-3 text-sm text-gray-300 border-t border-white/5">{children}</td>,
  }), []);

  return (
    <div className="flex flex-col gap-4">
      {isStreaming && content.length < 50 && (
        <div className="flex flex-wrap gap-2 mb-2">
          <ActionPill icon={<Search size={14}/>} label="Searching codebase..." />
          <ActionPill icon={<Terminal size={14}/>} label="Running analysis..." />
        </div>
      )}

      <div className="relative prose prose-invert prose-sm max-w-none">
        <ReactMarkdown 
          components={markdownComponents as any}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          remarkPlugins={[remarkGfm]}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && <StreamingCursor />}
      </div>
    </div>
  );
};

export default MessageContentRenderer;
