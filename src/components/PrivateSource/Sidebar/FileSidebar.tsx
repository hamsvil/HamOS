 
import React, { useState, useEffect } from 'react';
import { X, Info, History, MessageSquare, Activity, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem, FileVersion, FileComment, FileActivity } from '../types';
import { FileIcon, FileSize, FileDate } from '../FileGrid/FileComponents';
import { FileVersionHistory, FileCommentSection, FileActivityLog, FileDownloadStats } from './SidebarComponents';
import { useToast } from '../../../context/ToastContext';

interface FileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileItem | null;
  token?: string;
}

export const FileSidebar: React.FC<FileSidebarProps> = ({ isOpen, onClose, item, token }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'comments' | 'activity'>('info');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState<{
    versions: FileVersion[];
    comments: FileComment[];
    activities: FileActivity[];
    downloadCount: number;
    lastDownload: string;
  } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && item) {
      fetchMetadata();
    }
  }, [isOpen, item]);

  const fetchMetadata = async () => {
    if (!item) return;
    try {
      const response = await fetch(`/ham-api/private-source/file-metadata?path=${encodeURIComponent(item.path)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMetadata(data);
      }
    } catch (error) {
      console.error('Failed to fetch file metadata:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting || !item) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/ham-api/private-source/add-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path: item.path, text: newComment })
      });
      if (!res.ok) throw new Error('Failed to add comment');
      setNewComment('');
      fetchMetadata();
      showToast('Comment added');
    } catch (err: any) {
      showToast(err.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (!metadata) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-50">
          <Activity size={32} className="animate-pulse text-violet-400" />
          <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Fetching Neural Data...</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-violet-500/20 space-y-8">
        {activeTab === 'info' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-color)]">
                <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest block mb-1">Capacity</span>
                <div className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter">
                  <FileSize size={item.size} />
                </div>
              </div>
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-color)]">
                <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest block mb-1">Last Sync</span>
                <div className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tighter">
                  <FileDate modifiedAt={item.modifiedAt} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-50">Neural Properties</h3>
              <div className="space-y-2">
                <div className="p-4 bg-[var(--bg-tertiary)]/30 rounded-2xl border border-[var(--border-color)]">
                  <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest block mb-1 opacity-50">Identifier</label>
                  <p className="text-xs font-mono text-[var(--text-primary)] break-all leading-relaxed">{item.path}</p>
                </div>
                <FileDownloadStats count={metadata.downloadCount} lastDownload={metadata.lastDownload} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          metadata.versions.length > 0 ? (
            <FileVersionHistory versions={metadata.versions} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 opacity-30">
              <History size={32} className="mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Version History</p>
            </div>
          )
        )}

        {activeTab === 'comments' && (
          <div className="flex flex-col h-full gap-6">
            {metadata.comments.length > 0 ? (
              <FileCommentSection comments={metadata.comments} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 opacity-30">
                <MessageSquare size={32} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">No Neural Transmissions</p>
              </div>
            )}
            <form onSubmit={handleAddComment} className="mt-auto pt-6 border-t border-[var(--border-color)]">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Neural Transmission..."
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl p-4 pr-12 text-xs text-[var(--text-primary)] focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 transition-all placeholder:text-[var(--text-secondary)]/30 font-medium resize-none"
                  rows={3}
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="absolute bottom-3 right-3 p-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg active:scale-90"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'activity' && (
          metadata.activities.length > 0 ? (
            <FileActivityLog activities={metadata.activities} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 opacity-30">
              <Activity size={32} className="mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Recent Activity</p>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl z-[100] flex flex-col backdrop-blur-2xl bg-opacity-95"
        >
          {/* Header */}
          <div className="p-8 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-tertiary)]/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400">
                <FileIcon name={item.name} isDirectory={item.isDirectory} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter truncate max-w-[200px]">{item.name}</h2>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-50">Object Metadata</span>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-red-500/10 hover:text-red-400 rounded-2xl text-[var(--text-secondary)] transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
            {(['info', 'history', 'comments', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-violet-500 text-white shadow-[0_0_15px_rgba(167,139,250,0.4)]' : 'text-[var(--text-secondary)] hover:text-violet-400 hover:bg-violet-500/5'
                }`}
              >
                {tab === 'info' && <Info size={16} />}
                {tab === 'history' && <History size={16} />}
                {tab === 'comments' && <MessageSquare size={16} />}
                {tab === 'activity' && <Activity size={16} />}
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          {renderContent()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

