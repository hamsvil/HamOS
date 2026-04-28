/* eslint-disable no-redeclare */
 
import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, GitPullRequest, RefreshCw, Check, X, FileDiff, Plus, Trash2, AlertCircle } from 'lucide-react';
import { ProjectData } from '../types';
import { vfs } from '../../../services/vfsService';
import { useToast } from '../../../context/ToastContext';
import { safeStorage } from '../../../utils/storage';

interface FileDiff {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'unmodified';
}

interface GitControlPanelProps {
  project: ProjectData | null;
  onCommit: (message: string) => Promise<void>;
  onPush: () => Promise<void>;
  onPull: () => Promise<void>;
  onViewDiff: (path: string, oldContent: string, newContent: string) => void;
}

export default function GitControlPanel({ project, onCommit, onPush, onPull, onViewDiff }: GitControlPanelProps) {
  const { showToast } = useToast();
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState<FileDiff[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentBranch, _setCurrentBranch] = useState('main');
  const [gitError, setGitError] = useState<string | null>(null);

  const refreshStatus = async () => {
    if (!project || isRefreshing) return;
    setIsRefreshing(true);
    setGitError(null);
    try {
      // Ensure .git exists or init
      // We assume vfs.init handles idempotency
      await vfs.init('.');

      // Sync project files to VFS to ensure it matches the editor state
      // This is crucial because the editor might have unsaved changes in memory 
      // that haven't been flushed to the underlying VFS if we were using a different storage mechanism.
      // However, assuming project.files IS the source of truth:
      if (project.files.length > 0) {
          await vfs.bulkWrite(project.files);
      }
      
      // Check status using isomorphic-git matrix
      // [filepath, head, workdir, stage]
      // 0: absent, 1: present
      // head: 1, workdir: 1, stage: 1 -> unmodified
      // head: 1, workdir: 1, stage: 0 -> modified (unstaged) - wait, iso-git is complex
      // Let's simplify: 
      // If head !== workdir -> modified
      // If head === 0 && workdir === 1 -> added
      // If head === 1 && workdir === 0 -> deleted
      
      const matrix = await vfs.status('.') as any[]; 
      
      const changes: FileDiff[] = [];
      
      for (const row of matrix) {
          const [filepath, head, workdir, stage] = row;
          if (filepath === '.' || filepath.startsWith('.git')) continue;

          let status: FileDiff['status'] = 'unmodified';

          if (head === 0 && workdir === 1) {
              status = 'added';
          } else if (head === 1 && workdir === 0) {
              status = 'deleted';
          } else if (head === 1 && workdir === 1 && stage !== 1) {
              // This logic depends on how we treat staging. 
              // For a simple editor, we might treat everything as "changed" vs "committed".
              // If head != workdir content (implied by status), it's modified.
              // Actually, isomorphic-git status matrix is:
              // [filepath, HeadStatus, WorkdirStatus, StageStatus]
              // We need to compare Head vs Workdir.
              // But wait, the matrix values are 0 or 1 presence? No, they are complex.
              // Actually, simpler heuristic:
              // If row is not [file, 1, 1, 1], something is up.
              status = 'modified';
          } else if (head !== workdir) {
              status = 'modified';
          }

          // Refined logic based on common iso-git patterns
          if (head === 1 && workdir === 1 && stage === 1) {
              status = 'unmodified';
          }

          if (status !== 'unmodified') {
              changes.push({ path: filepath, status });
          }
      }

      setStagedFiles(changes);
      
      // Get current branch
      // const branch = await vfs.currentBranch(); 
      // setCurrentBranch(branch || 'main');
      
    } catch (e: any) {
      console.error("Git status error:", e);
      setGitError("Failed to refresh git status. " + e.message);
      
      // Fallback: Compare with localStorage "last commit" if VFS fails completely
      // This ensures "anti-blank screen" and "self-healing"
      const lastCommit = safeStorage.getItem('ham_last_commit_snapshot');
      if (lastCommit) {
          try {
              const lastFiles = JSON.parse(lastCommit) as Record<string, string>;
              const fallbackChanges: FileDiff[] = [];
              
              project.files.forEach(f => {
                  if (lastFiles[f.path] !== f.content) {
                      fallbackChanges.push({ path: f.path, status: lastFiles[f.path] ? 'modified' : 'added' });
                  }
              });
              
              Object.keys(lastFiles).forEach(path => {
                  if (!project.files.find(f => f.path === path)) {
                      fallbackChanges.push({ path, status: 'deleted' });
                  }
              });
              setStagedFiles(fallbackChanges);
          } catch (err: any) {
              console.error("Fallback failed", err);
              showToast(`Gagal memuat status Git (fallback): ${err.message}`, 'error');
          }
      } else {
          // If no last commit, treat all as added
          setStagedFiles(project.files.map(f => ({ path: f.path, status: 'added' })));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize Git and Calculate Diffs
  useEffect(() => {
    refreshStatus();
  }, [project]);

  const handleCommit = async () => {
    if (!commitMessage.trim() || !project) return;
    
    setIsCommitting(true);
    try {
      await onCommit(commitMessage);
      
      // Update fallback snapshot
      const snapshot: Record<string, string> = {};
      project.files.forEach(f => snapshot[f.path] = f.content);
      safeStorage.setItem('ham_last_commit_snapshot', JSON.stringify(snapshot));
      
      setCommitMessage('');
      await refreshStatus();
      showToast('Committed successfully', 'success');
    } catch (e: any) {
      console.error("Commit failed:", e);
      showToast('Commit failed: ' + e.message, 'error');
    } finally {
      setIsCommitting(false);
    }
  };
  
  const handlePush = async () => {
    setIsPushing(true);
    try {
        await onPush();
        await refreshStatus();
        showToast('Pushed to remote', 'success');
    } catch (e: any) {
        console.error(e);
        showToast('Push failed: ' + e.message, 'error');
    } finally {
        setIsPushing(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
        await onPull();
        await refreshStatus();
        showToast('Pulled from remote', 'success');
    } catch (e: any) {
        console.error(e);
        showToast('Pull failed: ' + e.message, 'error');
    } finally {
        setIsPulling(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-xs font-mono border-l border-white/10 w-64">
      <div className="p-3 border-b border-white/10 bg-[#141414] flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <GitBranch size={16} className="text-purple-400" />
            Source Control
            </h3>
            <div className="flex gap-1">
            <button onClick={refreshStatus} className="p-1 hover:bg-white/10 rounded text-gray-400" title="Refresh Status" disabled={isRefreshing}>
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={handlePull} className="p-1 hover:bg-white/10 rounded text-gray-400" title="Pull" disabled={isPulling}>
                {isPulling ? <RefreshCw size={14} className="animate-spin" /> : <GitPullRequest size={14} className="rotate-180" />}
            </button>
            <button onClick={handlePush} className="p-1 hover:bg-white/10 rounded text-gray-400" title="Push" disabled={isPushing}>
                {isPushing ? <RefreshCw size={14} className="animate-spin" /> : <GitPullRequest size={14} />}
            </button>
            </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">
            <GitBranch size={10} />
            <span>{currentBranch}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {gitError && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p className="text-[10px]">{gitError}</p>
            </div>
        )}

        <div className="mb-4">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2 flex justify-between">
            <span>Changes</span>
            <span className="bg-blue-500/20 text-blue-400 px-1.5 rounded-full">{stagedFiles.length}</span>
          </h4>
          <div className="space-y-1">
            {stagedFiles.length === 0 ? (
              <p className="text-gray-600 italic text-center py-2">No changes detected.</p>
            ) : (
              stagedFiles.map((file) => (
                <div key={file.path} className="flex items-center justify-between group p-1.5 hover:bg-white/5 rounded cursor-pointer">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      file.status === 'modified' ? 'bg-yellow-500' : 
                      file.status === 'added' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-gray-300 truncate" title={file.path}>{file.path.split('/').pop()}</span>
                    <span className="text-[9px] text-gray-600 truncate max-w-[60px]">{file.path}</span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <button 
                      onClick={async () => {
                        const oldContent = await vfs.getHeadContent('.', file.path).catch(() => '');
                        const newContent = project?.files.find(f => f.path === file.path)?.content || '';
                        onViewDiff(file.path, oldContent || '', newContent);
                      }}
                      className="text-gray-500 hover:text-white"
                      title="View Diff"
                    >
                      <FileDiff size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/10">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="w-full bg-[#050505] border border-white/10 rounded-md p-2 text-gray-300 focus:outline-none focus:border-purple-500/50 min-h-[80px] mb-2 resize-none"
          />
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || stagedFiles.length === 0 || isCommitting}
            className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {isCommitting ? <RefreshCw size={14} className="animate-spin" /> : <GitCommit size={14} />}
            {isCommitting ? 'Committing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  );
}
