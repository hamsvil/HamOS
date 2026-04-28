 
import React from 'react';
import { Folder, File, Info, Edit2, FolderPlus, Upload, MoreVertical, Grid, List, Shield, AlertCircle, CheckCircle, Lock, Trash2, Download, Terminal, GitCompare, CheckSquare } from 'lucide-react';
import { FileDetailsModalProps, RenameModalProps, CreateFolderModalProps, UploadProgressProps, FileActionMenuProps, SortDropdownProps, ViewModeToggleProps, FileExtensionBadgeProps, BreadcrumbItemProps, ErrorMessageProps, SuccessToastProps, PasswordInputProps, FileGridProps, FileListProps, ActionTooltipProps, FileContextMenuProps } from './PrivateSourceComponents2.types';

export const FileDetailsModal = ({ file, onClose }: FileDetailsModalProps) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4" onClick={e => e.stopPropagation()}>
      <h3 className="font-medium text-[var(--text-primary)]">File Details</h3>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Name</label>
          <p className="text-sm text-[var(--text-primary)] break-all">{file.name}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Path</label>
          <p className="text-xs font-mono text-[var(--text-secondary)] break-all">{file.path}</p>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Size</label>
          <p className="text-sm text-[var(--text-primary)]">{file.size} bytes</p>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">Close</button>
      </div>
    </div>
  </div>
);
export const RenameModal = ({ name, onRename, onClose }: { name: string; onRename: (n: string) => void; onClose: () => void }) => {
  const [val, setVal] = React.useState(name);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-medium text-[var(--text-primary)]">Rename File</h3>
        <input 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] px-3 py-2 rounded-lg w-full focus:outline-none focus:border-blue-500 transition-colors text-sm" 
          autoFocus
          onKeyDown={e => e.key === 'Enter' && onRename(val)}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onRename(val)} className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">Rename</button>
        </div>
      </div>
    </div>
  );
};
export const CreateFolderModal = ({ onCreate, onClose }: { onCreate: (n: string) => void; onClose: () => void }) => {
  const [val, setVal] = React.useState('');
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-medium text-[var(--text-primary)]">Create Folder</h3>
        <input 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          placeholder="Folder Name" 
          className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] px-3 py-2 rounded-lg w-full focus:outline-none focus:border-blue-500 transition-colors text-sm" 
          autoFocus
          onKeyDown={e => e.key === 'Enter' && val.trim() && onCreate(val)}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">Cancel</button>
          <button onClick={() => val.trim() && onCreate(val)} disabled={!val.trim()} className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors">Create</button>
        </div>
      </div>
    </div>
  );
};
export const UploadProgress = ({ progress }: { progress: number }) => <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} /></div>;
export const FileActionMenu = ({ actions }: { actions: any[] }) => <div className="flex gap-2">{actions.map((a, i) => <button key={i} onClick={a.onClick} className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors">{a.icon}</button>)}</div>;
export const SortDropdown = ({ onSort }: { onSort: (k: string) => void }) => <select onChange={e => onSort(e.target.value)} className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] p-1 rounded text-xs focus:outline-none focus:border-blue-500 transition-colors"><option value="name">Name</option><option value="size">Size</option></select>;
export const ViewModeToggle = ({ mode, onToggle }: { mode: 'grid' | 'list'; onToggle: () => void }) => <button onClick={onToggle} className="p-2 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors">{mode === 'grid' ? <List size={16} /> : <Grid size={16} />}</button>;
export const FileExtensionBadge = ({ name }: { name: string }) => <span className="text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-1 rounded border border-[var(--border-color)]">{name.split('.').pop()}</span>;
export const BreadcrumbItem = ({ name, onClick }: { name: string; onClick: () => void }) => <button onClick={onClick} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">{name}</button>;
export const EmptyState = () => <div className="text-center p-10 text-[var(--text-secondary)]"><Folder size={48} className="mx-auto mb-2 opacity-50" />Empty</div>;
export const LoadingSpinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />;
export const ErrorMessage = ({ msg }: { msg: string }) => <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-2"><AlertCircle size={16} />{msg}</div>;
export const SuccessToast = ({ msg }: { msg: string }) => <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg flex items-center gap-2"><CheckCircle size={16} />{msg}</div>;
export const PasswordInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <input type="password" value={value} onChange={e => onChange(e.target.value)} className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] p-2 rounded w-full focus:outline-none focus:border-blue-500 transition-colors" placeholder="Password" />;
export const FileGrid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-3 gap-4">{children}</div>;
export const FileList = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col gap-2">{children}</div>;
export const ActionTooltip = ({ text }: { text: string }) => <div className="absolute bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs p-1 rounded z-10 shadow-lg">{text}</div>;
export const FileContextMenu = ({ x, y, onClose, actions }: { x: number; y: number; onClose: () => void; actions: { label: string; icon: React.ReactNode; onClick: () => void; variant?: 'danger' | 'default' }[] }) => (
  <div 
    className="fixed bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] p-1.5 rounded-xl shadow-2xl z-[100] min-w-[160px] backdrop-blur-md" 
    style={{ top: y, left: x }}
    onClick={e => e.stopPropagation()}
  >
    <div className="flex flex-col gap-0.5">
      {actions.map((a, i) => (
        <button 
          key={i} 
          onClick={() => { a.onClick(); onClose(); }} 
          className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors w-full text-left ${
            a.variant === 'danger' 
              ? 'text-red-400 hover:bg-red-500/10' 
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <span className="opacity-70">{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  </div>
);
export const SelectionCounter = ({ count }: { count: number }) => <div className="text-xs text-[var(--text-secondary)]">{count} selected</div>;
export const FileActionToolbar = ({ children }: { children: React.ReactNode }) => <div className="flex gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-2 rounded-lg">{children}</div>;
