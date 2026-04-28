 
import React from 'react';
import { File, Folder, Trash2, FileArchive, ArchiveRestore, Download, Edit2, Share2, Move, Copy, Info, Eye, RefreshCw, Upload, Plus, Search, ArrowDownUp } from 'lucide-react';

export const FileIconLarge = ({ name }: { name: string }) => <File size={32} className="text-blue-400" />;
export const FileIconSmall = ({ name }: { name: string }) => <File size={16} className="text-blue-400" />;
export const FileIconMini = ({ name }: { name: string }) => <File size={12} className="text-blue-400" />;
export const FileActionDelete = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={16} className="text-red-400" /></button>;
export const FileActionZip = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-purple-500/10 rounded transition-colors"><FileArchive size={16} className="text-purple-400" /></button>;
export const FileActionUnzip = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-emerald-500/10 rounded transition-colors"><ArchiveRestore size={16} className="text-emerald-400" /></button>;
export const FileActionDownload = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-blue-500/10 rounded transition-colors"><Download size={16} className="text-blue-400" /></button>;
export const FileActionRename = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-blue-500/10 rounded transition-colors"><Edit2 size={16} className="text-blue-400" /></button>;
export const FileActionShare = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-emerald-500/10 rounded transition-colors"><Share2 size={16} className="text-emerald-400" /></button>;
export const FileActionMove = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-yellow-500/10 rounded transition-colors"><Move size={16} className="text-yellow-400" /></button>;
export const FileActionCopy = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-yellow-500/10 rounded transition-colors"><Copy size={16} className="text-yellow-400" /></button>;
export const FileActionInfo = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"><Info size={16} className="text-[var(--text-secondary)]" /></button>;
export const FileActionEdit = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-blue-500/10 rounded transition-colors"><Edit2 size={16} className="text-blue-400" /></button>;
export const FileActionView = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-blue-500/10 rounded transition-colors"><Eye size={16} className="text-blue-400" /></button>;
export const FileActionRefresh = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"><RefreshCw size={16} className="text-[var(--text-secondary)]" /></button>;
export const FileActionUpload = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-blue-500/10 rounded transition-colors"><Upload size={16} className="text-blue-400" /></button>;
export const FileActionCreateFolder = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-blue-500/10 rounded transition-colors"><Folder size={16} className="text-blue-400" /></button>;
export const FileActionCreateFile = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-blue-500/10 rounded transition-colors"><Plus size={16} className="text-blue-400" /></button>;
export const FileActionSort = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"><ArrowDownUp size={16} className="text-[var(--text-secondary)]" /></button>;
export const FileActionSearch = ({ onClick }: { onClick: () => void }) => <button onClick={onClick} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"><Search size={16} className="text-[var(--text-secondary)]" /></button>;
