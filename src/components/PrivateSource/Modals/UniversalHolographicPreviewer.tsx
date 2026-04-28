 
import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, Download, Share2, FileText, Image as ImageIcon, Video, Music, Code, File as FileIcon, Loader2, RefreshCw, Edit2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../context/ToastContext';
import Markdown from 'react-markdown';
import { Virtuoso } from 'react-virtuoso';
import { useSyntaxWorker } from '../Hooks/useSyntaxWorker';

interface UniversalHolographicPreviewerProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  token?: string;
}

export const UniversalHolographicPreviewer: React.FC<UniversalHolographicPreviewerProps> = ({ isOpen, onClose, filePath, token }) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isTooLarge, setIsTooLarge] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const fileExt = filePath.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExt);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt);
  const isPDF = fileExt === 'pdf';
  const isZip = ['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExt);
  const isCode = ['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'html', 'css', 'md', 'sh', 'yml', 'yaml', 'xml', 'sql', 'c', 'cpp', 'h', 'hpp', 'rs', 'go', 'php', 'rb', 'java', 'kt', 'swift'].includes(fileExt);

  const { lineCount, linesRef, loading: workerLoading } = useSyntaxWorker(content || '', fileExt === 'js' || fileExt === 'jsx' ? 'javascript' : fileExt === 'ts' || fileExt === 'tsx' ? 'typescript' : fileExt);

  useEffect(() => {
    if (isOpen && filePath) {
      loadContent();
    }
  }, [isOpen, filePath]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    setIsTooLarge(false);
    try {
      if (isZip) {
        const res = await fetch('/ham-api/private-source/zip-list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ filePath })
        });
        if (res.status === 401) throw new Error('Session expired. Please re-login.');
        if (!res.ok) throw new Error('Failed to list zip contents');
        const data = await res.json();
        setContent(data.files);
      } else if (isImage || isVideo || isAudio || isPDF) {
        const url = `/ham-api/private-source/download?path=${encodeURIComponent(filePath)}`;
        setContent(url);
      } else {
        const res = await fetch('/ham-api/private-source/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ filePath })
        });
        if (res.status === 401) throw new Error('Session expired. Please re-login.');
        if (!res.ok) throw new Error('Failed to read file');
        const data = await res.json();
        
        if (data.content && data.content.length > 500000) {
          setIsTooLarge(true);
          // Use read-chunk for larger files
          const chunkRes = await fetch('/ham-api/private-source/read-chunk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ filePath, start: 0, end: 500000 })
          });
          const chunkData = await chunkRes.json();
          const truncated = chunkData.chunk + '\n\n... [TRUNCATED FOR PERFORMANCE] ...';
          setContent(truncated);
          setEditContent(chunkData.chunk);
          setLines(truncated.split('\n'));
        } else {
          setContent(data.content);
          setEditContent(data.content);
          setLines(data.content.split('\n'));
        }
      }
    } catch (err: any) {
      console.error('[Previewer] Load failed:', err);
      setError(err.message || 'Failed to load preview');
      showToast(err.message || 'Failed to load preview', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const url = `/ham-api/private-source/download?path=${encodeURIComponent(filePath)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/ham-api/private-source/download?path=${encodeURIComponent(filePath)}`;
      if (navigator.share) {
        await navigator.share({
          title: filePath.split('/').pop(),
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/ham-api/private-source/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filePath, content: editContent })
      });
      if (!res.ok) throw new Error('Failed to save file');
      setContent(editContent);
      setLines(editContent.split('\n'));
      setIsEditing(false);
      showToast('File saved successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to save file', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Content copied to clipboard');
    } catch (err) {
      showToast('Failed to copy content', 'error');
    }
  };

  const CodeRow = ({ index, style }: { index: number, style: React.CSSProperties }) => (
    <div style={{ ...style, whiteSpace: 'pre', fontFamily: 'monospace', fontSize: '13px', color: '#d4d4d4', paddingLeft: '16px' }}>
      <span className="text-violet-500/50 mr-4 select-none inline-block w-8 text-right">{index + 1}</span>
      {lines[index] || ' '}
    </div>
  );

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 size={48} className="animate-spin text-violet-400" />
        <div className="flex flex-col items-center">
          <p className="text-xs font-black text-violet-400 uppercase tracking-widest animate-pulse">Initializing Hologram...</p>
          <p className="text-[8px] text-violet-400/40 uppercase tracking-[0.3em] mt-2">Syncing with Neural Core</p>
        </div>
      </div>
    );

    if (error) return (
      <div className="flex flex-col items-center justify-center gap-6 p-12 text-center bg-red-500/5 rounded-[3rem] border border-red-500/20 max-w-md">
        <div className="p-6 bg-red-500/10 rounded-full text-red-400">
          <X size={48} />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-red-400 font-black uppercase tracking-widest">Neural Link Interrupted</p>
          <p className="text-xs text-[var(--text-secondary)] opacity-70 leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={loadContent}
          className="px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-red-500/30 flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Re-Initialize Uplink
        </button>
      </div>
    );

    if (!content) return null;

    if (isImage) return <img src={content} alt={filePath} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" referrerPolicy="no-referrer" />;
    if (isVideo) return <video src={content} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />;
    if (isAudio) return (
      <div className="flex flex-col items-center justify-center gap-8 p-12 bg-violet-500/5 rounded-[3rem] border border-violet-500/20">
        <div className="p-8 bg-violet-500/10 rounded-full text-violet-400 animate-pulse">
          <Music size={64} />
        </div>
        <audio src={content} controls className="w-full max-w-md" />
      </div>
    );
    if (isPDF) return <iframe src={content} className="w-full h-full rounded-2xl border border-[var(--border-color)]" />;
    
    if (isZip) return (
      <div className="w-full h-full flex flex-col rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-tertiary)]">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Archive Contents</span>
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">{content.length} Items</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {content.map((file: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-primary)]/50 rounded-xl border border-[var(--border-color)] hover:border-violet-500/30 transition-all group">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon size={14} className={file.isDirectory ? 'text-blue-400' : 'text-violet-400'} />
                <span className="text-[10px] font-medium text-[var(--text-primary)] truncate uppercase tracking-tight">{file.name}</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--text-secondary)] opacity-50">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          ))}
        </div>
      </div>
    );

    if (fileExt === 'md') return (
      <div className="w-full h-full p-8 overflow-auto bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-2xl border border-[var(--border-color)] scrollbar-thin scrollbar-thumb-violet-500/20">
        <Markdown 
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-3 mt-6" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-2 mt-4" {...props} />,
            p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
            li: ({node, ...props}) => <li className="text-sm" {...props} />,
            a: ({node, ...props}) => <a className="text-violet-400 hover:underline" {...props} />,
            code: ({node, ...props}) => <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-sm font-mono text-violet-300" {...props} />,
            pre: ({node, ...props}) => <pre className="bg-[var(--bg-secondary)] p-4 rounded-xl overflow-x-auto mb-4 border border-[var(--border-color)]" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-violet-500 pl-4 italic opacity-80 mb-4" {...props} />,
          }}
        >
          {content}
        </Markdown>
      </div>
    );

    if (isCode || fileExt === 'txt') return (
      <div className="w-full h-full flex flex-col rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[#1e1e1e]">
        <style>{`
          .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #6a9955; }
          .token.punctuation { color: #d4d4d4; }
          .token.namespace { opacity: .7; }
          .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { color: #b5cea8; }
          .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #ce9178; }
          .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: #d4d4d4; }
          .token.atrule, .token.attr-value, .token.keyword { color: #c586c0; }
          .token.function, .token.class-name { color: #dcdcaa; }
          .token.regex, .token.important, .token.variable { color: #9cdcfe; }
        `}</style>
        {isTooLarge && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 flex items-center justify-between z-10">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">File too large for full preview. Truncated to 500KB.</p>
            <button onClick={handleDownload} className="text-[9px] font-black text-amber-400 hover:underline uppercase tracking-widest">Download Full File</button>
          </div>
        )}
        <div ref={containerRef} className="flex-1 min-h-0 w-full relative">
          {(workerLoading || loading) ? (
            <div className="absolute inset-0 flex items-center justify-center">
               <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          ) : isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] p-4 outline-none resize-none custom-scrollbar"
              spellCheck={false}
            />
          ) : lineCount > 0 ? (
            <Virtuoso
              totalCount={lineCount}
              itemContent={(index) => {
                const line = linesRef.current[index];
                return (
                  <div className="font-mono text-[13px] text-[#d4d4d4] px-4 hover:bg-white/5 flex leading-relaxed" style={{ minHeight: '20px' }}>
                    <span className="text-violet-500/50 mr-4 select-none inline-block w-8 text-right shrink-0">{index + 1}</span>
                    <span className="whitespace-pre-wrap break-all">
                      {line.map((token, i) => (
                        <span key={i} className={token.types.map(t => `token ${t}`).join(' ')}>
                          {token.content}
                        </span>
                      ))}
                      {line.length === 0 && ' '}
                    </span>
                  </div>
                );
              }}
              className="custom-scrollbar w-full h-full"
            />
          ) : null}
        </div>
      </div>
    );

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <FileIcon size={64} className="text-[var(--text-secondary)] opacity-20" />
        <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-widest">No preview available for this format</p>
        <button onClick={handleDownload} className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Download to View</button>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-2xl"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`bg-[var(--bg-secondary)] rounded-[3rem] border border-[var(--border-color)] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden transition-all duration-500 ${isFullScreen ? 'w-full h-full' : 'w-full max-w-6xl h-full max-h-[85vh]'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
                  {isImage && <ImageIcon size={20} />}
                  {isVideo && <Video size={20} />}
                  {isAudio && <Music size={20} />}
                  {isCode && <Code size={20} />}
                  {!isImage && !isVideo && !isAudio && !isCode && <FileText size={20} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter truncate max-w-md">{filePath.split('/').pop()}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em] opacity-50">/{filePath}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {(isCode || fileExt === 'txt' || fileExt === 'md') && (
                  <button onClick={handleCopy} className="p-3 hover:bg-[var(--bg-tertiary)] rounded-2xl text-[var(--text-secondary)] transition-all" title="Copy to Clipboard">
                    <FileText size={20} />
                  </button>
                )}
                {(isCode || fileExt === 'txt') && !isTooLarge && (
                  <>
                    {isEditing ? (
                      <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-500/30 flex items-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Save
                      </button>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-xl text-xs font-bold transition-all border border-violet-500/30 flex items-center gap-2">
                        <Edit2 size={14} /> Edit
                      </button>
                    )}
                    <div className="w-px h-6 bg-[var(--border-color)] mx-2" />
                  </>
                )}
                <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-3 hover:bg-[var(--bg-tertiary)] rounded-2xl text-[var(--text-secondary)] transition-all">
                  {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button onClick={handleDownload} className="p-3 hover:bg-[var(--bg-tertiary)] rounded-2xl text-[var(--text-secondary)] transition-all">
                  <Download size={20} />
                </button>
                <button onClick={handleShare} className="p-3 hover:bg-[var(--bg-tertiary)] rounded-2xl text-[var(--text-secondary)] transition-all">
                  <Share2 size={20} />
                </button>
                <div className="w-px h-6 bg-[var(--border-color)] mx-2" />
                <button onClick={onClose} className="p-3 hover:bg-red-500/10 hover:text-red-400 rounded-2xl text-[var(--text-secondary)] transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex items-center justify-center p-8 relative">
              {/* Holographic Grid Background */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
              
              {renderContent()}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-[var(--bg-tertiary)]/50 border-t border-[var(--border-color)] flex justify-between items-center">
              <div className="flex items-center gap-4 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                <span>Format: {fileExt}</span>
                <span className="opacity-30">|</span>
                <span>Status: Decrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Neural Uplink Active</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
