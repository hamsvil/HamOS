 
import React from 'react';
import { Shield, User, Users, Hash, Link, Database, Clock, Calendar, Zap, FileCode, FileText, Eye, Terminal, Cpu, HardDrive, AlertTriangle, Disc, FileInput, FileOutput, Settings } from 'lucide-react';

export const FilePermissionBadge = ({ p }: { p: string }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-[var(--text-secondary)] border border-[var(--border-color)]">{p}</span>;
export const FileOwnerBadge = ({ o }: { o: string }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-blue-400 border border-[var(--border-color)]">{o}</span>;
export const FileGroupBadge = ({ g }: { g: string }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-emerald-400 border border-[var(--border-color)]">{g}</span>;
export const FileInodeBadge = ({ i }: { i: string }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-yellow-400 border border-[var(--border-color)]">Inode: {i}</span>;
export const FileLinkCountBadge = ({ c }: { c: number }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-purple-400 border border-[var(--border-color)]">Links: {c}</span>;
export const FileBlockSizeBadge = ({ b }: { b: number }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-red-400 border border-[var(--border-color)]">Block: {b}</span>;
export const FileAccessTime = ({ t }: { t: number }) => <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><Clock size={10} /> {new Date(t).toLocaleTimeString()}</div>;
export const FileChangeTime = ({ t }: { t: number }) => <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><Calendar size={10} /> {new Date(t).toLocaleDateString()}</div>;
export const FileBirthTime = ({ t }: { t: number }) => <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><Zap size={10} /> {new Date(t).toLocaleDateString()}</div>;
export const FileChecksum = ({ c }: { c: string }) => <span className="text-[10px] font-mono text-[var(--text-secondary)] opacity-70">{c.slice(0, 8)}</span>;
export const FileMimeType = ({ m }: { m: string }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-[var(--text-secondary)] border border-[var(--border-color)]">{m}</span>;
export const FileEncoding = ({ e }: { e: string }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-[var(--text-secondary)] border border-[var(--border-color)]">{e}</span>;
export const FileLanguage = ({ l }: { l: string }) => <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded text-[var(--text-secondary)] border border-[var(--border-color)]">{l}</span>;
export const FileIsHidden = ({ h }: { h: boolean }) => h ? <Eye size={12} className="text-[var(--text-secondary)] opacity-50" /> : null;
export const FileIsExecutable = ({ e }: { e: boolean }) => e ? <Terminal size={12} className="text-red-400" /> : null;
export const FileIsSymlink = ({ s }: { s: boolean }) => s ? <Link size={12} className="text-blue-400" /> : null;
export const FileIsSocket = ({ s }: { s: boolean }) => s ? <Cpu size={12} className="text-yellow-400" /> : null;
export const FileIsPipe = ({ p }: { p: boolean }) => p ? <Database size={12} className="text-purple-400" /> : null;
export const FileIsBlockDevice = ({ b }: { b: boolean }) => b ? <HardDrive size={12} className="text-[var(--text-secondary)]" /> : null;
export const FileIsCharacterDevice = ({ c }: { c: boolean }) => c ? <AlertTriangle size={12} className="text-orange-400" /> : null;
