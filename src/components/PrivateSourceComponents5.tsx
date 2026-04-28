 
import React from 'react';
import { Eye, Image, Zap, Edit2, Trash2, FileArchive, ArchiveRestore, Download, Share2, Info, Tag, MessageSquare, History, Lock, Unlock, Shield, RefreshCw, User, Users, FileText, ShieldAlert } from 'lucide-react';

export const FilePreview = ({ path, content, type }: { path: string; content?: string; type?: string }) => (
  <div className="p-6 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-tertiary)]/30 backdrop-blur-sm flex flex-col items-center justify-center gap-4 min-h-[200px]">
    {type?.startsWith('image/') ? (
      <img src={content} alt={path} className="max-w-full max-h-48 rounded-lg shadow-lg object-contain" />
    ) : (
      <>
        <div className="p-4 bg-blue-500/10 rounded-2xl">
          <FileText size={64} className="text-blue-400 opacity-80" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">{path.split('/').pop()}</p>
          <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-1">{type || 'Unknown Type'}</p>
        </div>
      </>
    )}
  </div>
);

export const FileThumbnail = ({ path, type, url }: { path: string; type?: string; url?: string }) => (
  <div className="w-14 h-14 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center border border-[var(--border-color)] overflow-hidden group hover:border-blue-500/50 transition-all shadow-sm">
    {type?.startsWith('image/') && url ? (
      <img src={url} alt={path} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
    ) : (
      <div className="p-2 bg-blue-500/5 rounded-lg">
        <FileText size={24} className="text-blue-400/70" />
      </div>
    )}
  </div>
);
export const FileQuickActions = ({ children }: { children: React.ReactNode }) => <div className="flex gap-1">{children}</div>;
export const FileRenameInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <input value={value} onChange={(e) => onChange(e.target.value)} className="bg-[var(--bg-tertiary)] p-1 rounded text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:outline-none focus:border-blue-500" />;
export const FileDeleteConfirm = ({ onConfirm }: { onConfirm: () => void }) => <button onClick={onConfirm} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={16} /></button>;
export const FileZipConfirm = ({ onConfirm }: { onConfirm: () => void }) => <button onClick={onConfirm} className="text-purple-400 hover:text-purple-300 transition-colors"><FileArchive size={16} /></button>;
export const FileUnzipConfirm = ({ onConfirm }: { onConfirm: () => void }) => <button onClick={onConfirm} className="text-emerald-400 hover:text-emerald-300 transition-colors"><ArchiveRestore size={16} /></button>;
export const FileDownloadButton = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="text-blue-400 hover:text-blue-300 transition-colors"><Download size={16} /></button>;
export const FileShareButton = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Share2 size={16} /></button>;
export const FilePropertiesPanel = ({ children }: { children: React.ReactNode }) => <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)]">{children}</div>;
export const FileTagsInput = ({ tags }: { tags: string[] }) => <div className="flex gap-1 text-[var(--text-secondary)]"><Tag size={12} /> {tags.join(', ')}</div>;
export const FileCommentInput = ({ comment }: { comment: string }) => <div className="flex gap-1 text-[var(--text-secondary)]"><MessageSquare size={12} /> {comment}</div>;
export const FileVersionHistoryLegacy = ({ version }: { version: string }) => <div className="flex gap-1 text-[var(--text-secondary)]"><History size={12} /> v{version}</div>;
export const FileLockStatus = ({ locked }: { locked: boolean }) => <div className="flex gap-1">{locked ? <Lock size={12} className="text-red-400" /> : <Unlock size={12} className="text-emerald-400" />}</div>;
export const FileEncryptionStatusLegacy = ({ encrypted }: { encrypted: boolean }) => <div className="flex gap-1"><Shield size={12} className={encrypted ? 'text-blue-400' : 'text-[var(--text-secondary)] opacity-50'} /></div>;
export const FileSyncStatusLegacy = ({ synced }: { synced: boolean }) => <div className="flex gap-1"><RefreshCw size={12} className={synced ? 'text-emerald-400' : 'text-yellow-400'} /></div>;
export const FileOwnerAvatarLegacy = ({ owner }: { owner: string }) => <div className="flex items-center gap-1 text-[var(--text-secondary)]"><User size={12} /> {owner}</div>;
export const FileGroupAvatar = ({ group }: { group: string }) => <div className="flex items-center gap-1 text-[var(--text-secondary)]"><Users size={12} /> {group}</div>;
export const FileAccessLog = ({ log }: { log: string }) => <div className="text-[10px] text-[var(--text-secondary)] opacity-70">{log}</div>;
export const FileAuditTrail = ({ trail }: { trail: string }) => <div className="flex gap-1 text-[var(--text-secondary)]"><ShieldAlert size={12} /> {trail}</div>;
