 
import React from 'react';
import { Tag, User, Users, ShieldCheck, History, MessageSquare, Activity, Download, Image, Filter, Calendar, Sliders, Trash2, RotateCcw, Trash, PieChart, Cloud, CloudOff, Star, Search, RefreshCw } from 'lucide-react';

// 1. FileTagBadge
export const FileTagBadge = ({ tag, color = 'blue' }: { tag: string; color?: string }) => (
  <span className={`text-[10px] px-2 py-0.5 rounded-full border border-${color}-500/30 bg-${color}-500/10 text-${color}-400 flex items-center gap-1`}>
    <Tag size={10} /> {tag}
  </span>
);

// 2. FileOwnerAvatar
export const FileOwnerAvatar = ({ name, imageUrl }: { name: string; imageUrl?: string }) => (
  <div className="flex items-center gap-2 group cursor-pointer">
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden border border-white/10">
      {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
    </div>
    <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{name}</span>
  </div>
);

// 3. FileSharedWithList
export const FileSharedWithList = ({ users }: { users: { name: string; avatar?: string }[] }) => (
  <div className="flex -space-x-2 overflow-hidden">
    {users.map((user, i) => (
      <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-[var(--bg-secondary)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[8px] font-bold text-[var(--text-secondary)] border border-[var(--border-color)]" title={user.name}>
        {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" /> : user.name.charAt(0).toUpperCase()}
      </div>
    ))}
    {users.length > 3 && (
      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[var(--bg-secondary)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[8px] font-bold text-[var(--text-secondary)] border border-[var(--border-color)]">
        +{users.length - 3}
      </div>
    )}
  </div>
);

// 4. FileEncryptionStatus
export const FileEncryptionStatus = ({ isEncrypted }: { isEncrypted: boolean }) => (
  <div className={`flex items-center gap-1.5 text-xs ${isEncrypted ? 'text-emerald-400' : 'text-amber-400'}`}>
    <ShieldCheck size={14} className={isEncrypted ? 'animate-pulse' : ''} />
    <span>{isEncrypted ? 'AES-256 Encrypted' : 'Unencrypted'}</span>
  </div>
);

// 5. FileVersionHistory
export const FileVersionHistory = ({ versions }: { versions: { version: string; date: string; author: string }[] }) => (
  <div className="space-y-2">
    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
      <History size={14} /> Version History
    </h4>
    <div className="space-y-1">
      {versions.map((v, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)] hover:border-blue-500/30 transition-colors cursor-pointer group">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[var(--text-primary)]">v{v.version}</span>
            <span className="text-[10px] text-[var(--text-secondary)]">{v.date}</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] group-hover:text-blue-400">{v.author}</span>
        </div>
      ))}
    </div>
  </div>
);

// 6. FileCommentSection
export const FileCommentSection = ({ comments }: { comments: { user: string; text: string; date: string }[] }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
      <MessageSquare size={14} /> Comments ({comments.length})
    </h4>
    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
      {comments.map((c, i) => (
        <div key={i} className="p-2 rounded-xl bg-[var(--bg-tertiary)]/20 border border-[var(--border-color)]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-blue-400">{c.user}</span>
            <span className="text-[9px] text-[var(--text-secondary)]">{c.date}</span>
          </div>
          <p className="text-xs text-[var(--text-primary)] leading-relaxed">{c.text}</p>
        </div>
      ))}
    </div>
  </div>
);

// 7. FileActivityLog
export const FileActivityLog = ({ activities }: { activities: { action: string; user: string; date: string }[] }) => (
  <div className="space-y-2">
    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
      <Activity size={14} /> Recent Activity
    </h4>
    <div className="relative pl-4 space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-[var(--border-color)]">
      {activities.map((a, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-blue-500 border-2 border-[var(--bg-secondary)]" />
          <div className="text-[10px]">
            <span className="font-bold text-[var(--text-primary)]">{a.user}</span>
            <span className="text-[var(--text-secondary)] mx-1">{a.action}</span>
            <span className="text-[var(--text-secondary)] opacity-50">{a.date}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 8. FileDownloadStats
export const FileDownloadStats = ({ count, lastDownload }: { count: number; lastDownload: string }) => (
  <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
      <Download size={18} />
    </div>
    <div>
      <div className="text-lg font-bold text-[var(--text-primary)]">{count}</div>
      <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-tighter">Total Downloads</div>
    </div>
    <div className="ml-auto text-right">
      <div className="text-[9px] text-[var(--text-secondary)] uppercase">Last Access</div>
      <div className="text-[10px] font-medium text-[var(--text-primary)]">{lastDownload}</div>
    </div>
  </div>
);

// 9. FilePreviewGallery
export const FilePreviewGallery = ({ items }: { items: { name: string; url: string }[] }) => (
  <div className="grid grid-cols-2 gap-2">
    {items.map((item, i) => (
      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-[var(--border-color)] group relative cursor-pointer">
        <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Image size={20} className="text-white" />
        </div>
      </div>
    ))}
  </div>
);

// 10. FileTypeFilter
export const FileTypeFilter = ({ active, onFilter }: { active: string; onFilter: (type: string) => void }) => {
  const types = ['All', 'Images', 'Documents', 'Videos', 'Archives', 'Code'];
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
      {types.map(t => (
        <button
          key={t}
          onClick={() => onFilter(t)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
            active === t 
              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' 
              : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-blue-500/50 hover:text-[var(--text-primary)]'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
};

// 11. FileDateRangePicker
export const FileDateRangePicker = ({ onChange }: { onChange: (range: { start: string; end: string }) => void }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
    <Calendar size={14} className="text-[var(--text-secondary)]" />
    <input type="date" className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none" onChange={e => onChange({ start: e.target.value, end: '' })} />
    <span className="text-[var(--text-secondary)]">-</span>
    <input type="date" className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none" onChange={e => onChange({ start: '', end: e.target.value })} />
  </div>
);

// 12. FileSizeSlider
export const FileSizeSlider = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex flex-col justify-center h-full pl-6">
    <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-bold uppercase mb-1">
      <span>Min Size</span>
      <span className="text-blue-400">{value} MB</span>
    </div>
    <div className="relative flex items-center">
      <Sliders size={12} className="absolute -left-5 text-[var(--text-secondary)] pointer-events-none" />
      <input 
        type="range" 
        min="0" 
        max="1024" 
        value={value} 
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  </div>
);

// 13. FileTrashBin
export const FileTrashBin = ({ items, onRestore, onDelete }: { items: any[]; onRestore: (id: string) => void; onDelete: (id: string) => void }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
        <Trash2 size={18} className="text-red-400" /> Trash Bin
      </h3>
      <button className="text-[10px] text-red-400 hover:underline">Empty Trash</button>
    </div>
    {items.length === 0 ? (
      <div className="text-center py-8 text-[var(--text-secondary)] text-xs italic">Trash is empty</div>
    ) : (
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10 group">
            <span className="text-xs text-[var(--text-primary)] truncate flex-1">{item.name}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onRestore(item.id)} className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded" title="Restore"><RotateCcw size={14} /></button>
              <button onClick={() => onDelete(item.id)} className="p-1 hover:bg-red-500/20 text-red-400 rounded" title="Delete Permanently"><Trash size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// 14. FileRestoreButton
export const FileRestoreButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-emerald-500/20">
    <RotateCcw size={14} /> Restore File
  </button>
);

// 15. FilePermanentDeleteButton
export const FilePermanentDeleteButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-red-500/20">
    <Trash size={14} /> Delete Permanently
  </button>
);

// 16. FileStorageUsageChart
export const FileStorageUsageChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <div className="flex h-1.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
      {data.map((d, i) => (
        <div key={i} style={{ width: `${d.value}%`, backgroundColor: d.color }} title={`${d.label}: ${d.value}%`} />
      ))}
    </div>
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
          <span className="text-[9px] text-[var(--text-secondary)]">{d.label}</span>
          <span className="text-[9px] font-bold text-[var(--text-primary)]">{d.value}%</span>
        </div>
      ))}
    </div>
  </div>
);

// 17. FileSyncStatus
export const FileSyncStatus = ({ status }: { status: 'synced' | 'syncing' | 'error' | 'offline' }) => {
  const config: Record<string, { icon: any; color: string; label: string; animate?: string }> = {
    synced: { icon: Cloud, color: 'text-emerald-400', label: 'Synced' },
    syncing: { icon: RefreshCw, color: 'text-blue-400', label: 'Syncing...', animate: 'animate-spin' },
    error: { icon: CloudOff, color: 'text-red-400', label: 'Sync Error' },
    offline: { icon: CloudOff, color: 'text-[var(--text-secondary)]', label: 'Offline' }
  };
  const item = config[status] || config.offline;
  const { icon: Icon, color, label, animate } = item;
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-medium ${color}`}>
      <Icon size={12} className={animate} />
      <span>{label}</span>
    </div>
  );
};

// 18. FileOfflineToggle
export const FileOfflineToggle = ({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: () => void }) => (
  <button 
    onClick={onToggle}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
      isEnabled 
        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
        : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)]'
    }`}
  >
    {isEnabled ? <Cloud size={14} /> : <CloudOff size={14} />}
    <span className="text-[10px] font-bold uppercase">Offline Access</span>
    <div className={`w-6 h-3 rounded-full relative transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-gray-600'}`}>
      <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
    </div>
  </button>
);

// 19. FileFavoriteButton
export const FileFavoriteButton = ({ isFavorite, onClick }: { isFavorite: boolean; onClick: (e: React.MouseEvent) => void }) => (
  <button 
    onClick={onClick}
    className={`p-1.5 rounded-lg transition-all ${isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
  >
    <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
  </button>
);

// 20. FileSearchHistory
export const FileSearchHistory = ({ queries, onSelect, onClear }: { queries: string[]; onSelect: (q: string) => void; onClear: () => void }) => (
  <div className="p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl w-64">
    <div className="flex items-center justify-between mb-2 px-2">
      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Recent Searches</span>
      <button onClick={onClear} className="text-[9px] text-red-400 hover:underline">Clear</button>
    </div>
    <div className="space-y-1">
      {queries.map((q, i) => (
        <button 
          key={i} 
          onClick={() => onSelect(q)}
          className="w-full text-left px-2 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg flex items-center gap-2 transition-colors"
        >
          <Search size={12} className="text-[var(--text-secondary)]" />
          <span className="truncate">{q}</span>
        </button>
      ))}
    </div>
  </div>
);
