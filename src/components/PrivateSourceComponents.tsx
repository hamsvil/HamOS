 
import React from 'react';
import { Folder, File, FileText, Image, Film, Music, Archive, FileCode, FileJson, FileType, Clock, HardDrive, Shield, Copy, Search, Trash2, Download, Terminal, GitCompare, Info } from 'lucide-react';

import { FileItem } from './PrivateSourceComponents.types';

export interface FileIconProps {
  name: string;
  isDirectory: boolean;
}

export interface FileSizeProps {
  size: number;
}

export interface FileDateProps {
  modifiedAt: number;
}

export const FileIcon = ({ name, isDirectory }: FileIconProps) => {
  if (isDirectory) return <Folder size={20} className="text-blue-400 fill-blue-400/20" />;
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext || '')) return <Image size={20} className="text-pink-400" />;
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return <Film size={20} className="text-purple-400" />;
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) return <Music size={20} className="text-yellow-400" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <Archive size={20} className="text-emerald-400" />;
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'go', 'rust', 'c', 'cpp', 'h', 'java', 'php'].includes(ext || '')) return <FileCode size={20} className="text-blue-500" />;
  if (['json', 'yaml', 'yml', 'xml', 'toml'].includes(ext || '')) return <FileJson size={20} className="text-orange-400" />;
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(ext || '')) return <FileText size={20} className="text-gray-400" />;
  return <File size={20} className="text-gray-500" />;
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
export const Breadcrumb = ({ path, onClick }: { path: string; onClick: (p: string) => void }) => (
  <div className="flex gap-1 text-sm text-[var(--text-secondary)]">
    <button onClick={() => onClick('')} className="hover:text-[var(--text-primary)] transition-colors">root</button>
    {path.split('/').filter(Boolean).map((p, i, arr) => (
      <button key={i} onClick={() => onClick(arr.slice(0, i + 1).join('/'))} className="hover:text-[var(--text-primary)] transition-colors">/ {p}</button>
    ))}
  </div>
);
export const SearchBar = ({ value, onChange, onToggleMode, mode }: { value: string; onChange: (v: string) => void; onToggleMode?: () => void; mode?: 'name' | 'content' }) => (
  <div className="relative flex items-center">
    <Search size={16} className="absolute left-2.5 text-[var(--text-secondary)]" />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={`Search ${mode || 'name'}...`} className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg pl-8 pr-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-500 transition-colors" />
    {onToggleMode && (
      <button onClick={onToggleMode} className="ml-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
        {mode === 'name' ? 'Name' : 'Content'}
      </button>
    )}
  </div>
);
export const SortControls = ({ onSort }: { onSort: (key: string) => void }) => (
  <select onChange={e => onSort(e.target.value)} className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"><option value="name">Name</option><option value="size">Size</option><option value="modifiedAt">Date</option></select>
);
export const CopyPathButton = ({ path }: { path: string }) => <button onClick={() => navigator.clipboard.writeText(path)} className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors"><Copy size={14} /></button>;
export const PermissionsDisplay = ({ path }: { path: string }) => <div className="flex gap-1 text-[10px] text-[var(--text-secondary)]"><Shield size={12} /> rwx</div>;
export const DiskUsageBar = ({ usage }: { usage: number }) => <div className="h-1 bg-[var(--bg-tertiary)] rounded-full w-24 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${usage}%` }} /></div>;
export const RecentFilesList = ({ files }: { files: any[] }) => <div className="text-xs text-[var(--text-secondary)]">Recent: {files.map(f => f.name).join(', ')}</div>;
export const MetadataSidebar = ({ file }: { file: any }) => <div className="w-48 border-l border-[var(--border-color)] p-4 text-xs text-[var(--text-primary)]"><Info size={16} className="mb-2 text-[var(--text-secondary)]" /><div>{file.name}</div><FileSize size={file.size} /></div>;
export const ThemeToggle = ({ onToggle }: { onToggle: () => void }) => <button onClick={onToggle} className="p-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors">T</button>;
export const ShortcutsModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4" onClick={e => e.stopPropagation()}>
      <h3 className="font-medium text-[var(--text-primary)]">Keyboard Shortcuts</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-[var(--text-secondary)]">New File</span>
          <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-xs font-mono text-[var(--text-primary)]">Ctrl+N</kbd>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-[var(--text-secondary)]">Save</span>
          <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-xs font-mono text-[var(--text-primary)]">Ctrl+S</kbd>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-[var(--text-secondary)]">Search</span>
          <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-xs font-mono text-[var(--text-primary)]">Ctrl+F</kbd>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">Close</button>
      </div>
    </div>
  </div>
);
export const BulkSelector = ({ selected, onToggle }: { selected: boolean; onToggle: () => void }) => <input type="checkbox" checked={selected} onChange={onToggle} className="accent-blue-500" />;
export const BulkDeleteButton = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={16} /></button>;
export const BulkDownloadButton = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="text-blue-400 hover:text-blue-300 transition-colors"><Download size={16} /></button>;
export const TerminalOpener = ({ path }: { path: string }) => <button className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors"><Terminal size={14} /></button>;
export const FileDiffButton = ({ path }: { path: string }) => <button className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors"><GitCompare size={14} /></button>;
