 
import React from 'react';
import { History, MessageSquare, Activity, Download } from 'lucide-react';
import { FileVersion, FileComment, FileActivity } from '../types';

export const FileVersionHistory = ({ versions }: { versions: FileVersion[] }) => (
  <div className="space-y-3">
    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
      <History size={12} /> Version History
    </h4>
    <div className="space-y-1.5">
      {versions.map((v, i) => (
        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer group shadow-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-blue-400 transition-colors">v{v.version}</span>
            <span className="text-[9px] font-medium text-[var(--text-secondary)]">{v.date}</span>
          </div>
          <span className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1 rounded-md border border-[var(--border-color)] group-hover:border-blue-500/20 transition-colors">{v.author}</span>
        </div>
      ))}
    </div>
  </div>
);

export const FileCommentSection = ({ comments }: { comments: FileComment[] }) => (
  <div className="space-y-3">
    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
      <MessageSquare size={12} /> Comments ({comments.length})
    </h4>
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
      {comments.map((c, i) => (
        <div key={i} className="p-3 rounded-xl bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)] shadow-sm hover:border-blue-500/20 transition-colors">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold text-blue-400">{c.user}</span>
            <span className="text-[9px] font-medium text-[var(--text-secondary)]">{c.date}</span>
          </div>
          <p className="text-xs text-[var(--text-primary)] leading-relaxed">{c.text}</p>
        </div>
      ))}
    </div>
  </div>
);

export const FileActivityLog = ({ activities }: { activities: FileActivity[] }) => (
  <div className="space-y-3">
    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
      <Activity size={12} /> Recent Activity
    </h4>
    <div className="relative pl-5 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--border-color)]">
      {activities.map((a, i) => (
        <div key={i} className="relative group">
          <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[var(--bg-secondary)] group-hover:scale-125 transition-transform shadow-sm" />
          <div className="text-[10px] bg-[var(--bg-tertiary)]/20 p-2 rounded-lg border border-[var(--border-color)] shadow-sm hover:border-blue-500/20 transition-colors">
            <span className="font-bold text-[var(--text-primary)]">{a.user}</span>
            <span className="text-[var(--text-secondary)] mx-1">{a.action}</span>
            <span className="text-[9px] font-medium text-[var(--text-secondary)] opacity-70 block mt-0.5">{a.date}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FileDownloadStats = ({ count, lastDownload }: { count: number; lastDownload: string }) => (
  <div className="flex items-center gap-4 p-3.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 shadow-sm">
    <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 shadow-inner">
      <Download size={20} />
    </div>
    <div className="flex flex-col">
      <div className="text-xl font-black text-[var(--text-primary)] tracking-tight">{count}</div>
      <div className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Downloads</div>
    </div>
    <div className="ml-auto text-right flex flex-col justify-center">
      <div className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Last Access</div>
      <div className="text-[10px] font-medium text-[var(--text-primary)] mt-0.5">{lastDownload}</div>
    </div>
  </div>
);
