 
import React from 'react';
import { Info } from 'lucide-react';

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

export const FileDetailsModal = ({ file, onClose }: { file: any; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <Info size={20} className="text-blue-400" />
        </div>
        <h3 className="font-medium text-[var(--text-primary)]">File Details</h3>
      </div>
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
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Modified</label>
          <p className="text-sm text-[var(--text-primary)]">{new Date(file.modifiedAt).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">Close</button>
      </div>
    </div>
  </div>
);

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
