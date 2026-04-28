 
import React from 'react';
import { Folder, File, FileText, Image, Film, Music, Archive, FileCode, FileJson, Tag, ShieldCheck, Cloud, CloudOff, RefreshCw, Star } from 'lucide-react';

export const FileIcon = ({ name, isDirectory }: { name: string; isDirectory: boolean }) => {
  if (isDirectory) return (
    <div className="p-1 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-sm flex items-center justify-center">
      <Folder size={14} className="text-blue-400" />
    </div>
  );
  const ext = name.split('.').pop()?.toLowerCase();
  
  let Icon = File;
  let colorClass = 'text-gray-400';
  let bgClass = 'bg-gray-500/10 border-gray-500/20';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext || '')) {
    Icon = Image; colorClass = 'text-pink-400'; bgClass = 'bg-pink-500/10 border-pink-500/20';
  } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
    Icon = Film; colorClass = 'text-purple-400'; bgClass = 'bg-purple-500/10 border-purple-500/20';
  } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
    Icon = Music; colorClass = 'text-yellow-400'; bgClass = 'bg-yellow-500/10 border-yellow-500/20';
  } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    Icon = Archive; colorClass = 'text-emerald-400'; bgClass = 'bg-emerald-500/10 border-emerald-500/20';
  } else if (['ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'go', 'rust', 'c', 'cpp', 'h', 'java', 'php'].includes(ext || '')) {
    Icon = FileCode; colorClass = 'text-blue-400'; bgClass = 'bg-blue-500/10 border-blue-500/20';
  } else if (['json', 'yaml', 'yml', 'xml', 'toml'].includes(ext || '')) {
    Icon = FileJson; colorClass = 'text-orange-400'; bgClass = 'bg-orange-500/10 border-orange-500/20';
  } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(ext || '')) {
    Icon = FileText; colorClass = 'text-slate-400'; bgClass = 'bg-slate-500/10 border-slate-500/20';
  }

  return (
    <div className={`p-1 rounded-lg border shadow-sm flex items-center justify-center ${bgClass}`}>
      <Icon size={14} className={colorClass} />
    </div>
  );
};

export const FileSize = ({ size }: { size: number }) => {
  if (size === 0) return <span className="text-xs text-[var(--text-secondary)]">0 B</span>;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return <span className="text-xs text-[var(--text-secondary)]">{parseFloat((size / Math.pow(k, i)).toFixed(1))} {sizes[i]}</span>;
};

export const FileDate = ({ modifiedAt }: { modifiedAt: number }) => {
  const date = new Date(modifiedAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  let label = date.toLocaleDateString();
  if (days === 0) label = 'Today';
  else if (days === 1) label = 'Yesterday';
  else if (days < 7) label = `${days} days ago`;

  return <span className="text-xs text-[var(--text-secondary)]" title={date.toLocaleString()}>{label}</span>;
};

export const FileTagBadge = ({ tag, color = 'blue' }: { tag: string; color?: string }) => (
  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-${color}-500/30 bg-${color}-500/10 text-${color}-400 flex items-center gap-1 shadow-sm`}>
    <Tag size={10} /> {tag}
  </span>
);

export const FileOwnerAvatar = ({ name, imageUrl }: { name: string; imageUrl?: string }) => (
  <div className="flex items-center gap-1.5 group cursor-pointer">
    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden border border-white/20 shadow-sm">
      {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : name.charAt(0).toUpperCase()}
    </div>
    <span className="text-[10px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{name}</span>
  </div>
);

export const FileSharedWithList = ({ users }: { users: { name: string; avatar?: string }[] }) => (
  <div className="flex -space-x-2 overflow-hidden hover:space-x-1 transition-all duration-300">
    {users.slice(0, 3).map((user, i) => (
      <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-[var(--bg-secondary)] bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-[9px] font-bold text-white border border-white/10 shadow-sm transition-transform hover:scale-110 hover:z-10" title={user.name}>
        {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" /> : user.name.charAt(0).toUpperCase()}
      </div>
    ))}
    {users.length > 3 && (
      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[var(--bg-secondary)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[9px] font-bold text-[var(--text-secondary)] border border-[var(--border-color)] shadow-sm z-0">
        +{users.length - 3}
      </div>
    )}
  </div>
);

export const FileEncryptionStatus = ({ isEncrypted }: { isEncrypted: boolean }) => (
  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider shadow-sm ${isEncrypted ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
    <ShieldCheck size={10} className={isEncrypted ? 'animate-pulse' : ''} />
    <span>{isEncrypted ? 'Encrypted' : 'Unencrypted'}</span>
  </div>
);

export const FileSyncStatus = ({ status }: { status: 'synced' | 'syncing' | 'error' | 'offline' }) => {
  const config: Record<string, { icon: any; color: string; label: string; animate?: string; bg: string }> = {
    synced: { icon: Cloud, color: 'text-emerald-400', label: 'Synced', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    syncing: { icon: RefreshCw, color: 'text-blue-400', label: 'Syncing...', animate: 'animate-spin', bg: 'bg-blue-500/10 border-blue-500/20' },
    error: { icon: CloudOff, color: 'text-red-400', label: 'Sync Error', bg: 'bg-red-500/10 border-red-500/20' },
    offline: { icon: CloudOff, color: 'text-[var(--text-secondary)]', label: 'Offline', bg: 'bg-[var(--bg-tertiary)] border-[var(--border-color)]' }
  };
  const item = config[status] || config.offline;
  const { icon: Icon, color, label, animate, bg } = item;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${color} ${bg} shadow-sm`}>
      <Icon size={10} className={animate} />
      <span>{label}</span>
    </div>
  );
};

export const FileFavoriteButton = ({ isFavorite, onClick }: { isFavorite: boolean; onClick: (e: React.MouseEvent) => void }) => (
  <button 
    onClick={onClick}
    className={`p-1.5 rounded-lg transition-all ${isFavorite ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-transparent'}`}
  >
    <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]' : ''} />
  </button>
);
