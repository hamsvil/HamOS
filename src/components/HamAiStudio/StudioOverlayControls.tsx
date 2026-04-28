 
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, ShieldCheck, MoreVertical, Settings, CloudUpload, Zap, Clock, Sparkles, X 
} from 'lucide-react';

const Github = ({ size }: { size?: number }) => <div style={{ width: size, height: size }} className="flex items-center justify-center font-bold">G</div>;

interface StudioOverlayControlsProps {
  githubSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  githubRepoUrl: string | null;
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: (isOpen: boolean) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsExportManagerOpen: (isOpen: boolean) => void;
  setIsApkBuilderOpen: (isOpen: boolean) => void;
  setIsHistoryOpen: (isOpen: boolean) => void;
  setShowWelcome: (show: boolean) => void;
}

export default function StudioOverlayControls({
  githubSyncStatus,
  githubRepoUrl,
  isMoreMenuOpen,
  setIsMoreMenuOpen,
  setIsSettingsOpen,
  setIsExportManagerOpen,
  setIsApkBuilderOpen,
  setIsHistoryOpen,
  setShowWelcome
}: StudioOverlayControlsProps) {
  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMoreMenuOpen && !target.closest('.more-menu-container')) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen, setIsMoreMenuOpen]);

  return (
    <div className="absolute top-2 right-2 z-40 flex items-center gap-2 pointer-events-auto">
      {githubSyncStatus !== 'idle' && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md transition-all shadow-lg ${
          githubSyncStatus === 'syncing' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
          githubSyncStatus === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {githubSyncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : 
           githubSyncStatus === 'success' ? <Github size={12} /> : <ShieldCheck size={12} />}
          <span className="hidden sm:inline">
            {githubSyncStatus === 'syncing' ? 'Syncing...' : 
             githubSyncStatus === 'success' ? 'Synced' : 'Failed'}
          </span>
          {githubRepoUrl && githubSyncStatus === 'success' && (
            <a href={githubRepoUrl} target="_blank" rel="noopener noreferrer" className="ml-1 hover:text-white transition-colors">
              <span className="sr-only">Open Repo</span>
              <Github size={10} />
            </a>
          )}
        </div>
      )}

      <div className="relative more-menu-container flex items-center gap-2">
        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="p-1.5 rounded-full bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors backdrop-blur-md shadow-lg"
          title="Restore Version / History"
        >
          <Clock size={16} />
        </button>
        <button 
          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
          className="p-1.5 rounded-full bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors backdrop-blur-md shadow-lg"
        >
          <MoreVertical size={16} />
        </button>

        <AnimatePresence>
          {isMoreMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-1 space-y-0.5">
                <button onClick={() => { setIsSettingsOpen(true); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-left">
                  <Settings size={14} /> Settings
                </button>
                <button onClick={() => { setIsExportManagerOpen(true); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-left">
                  <CloudUpload size={14} /> Export Project
                </button>
                <button onClick={() => { setIsApkBuilderOpen(true); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-left">
                  <Zap size={14} /> Build APK
                </button>
                <div className="h-px bg-[var(--border-color)] my-1" />
                <button onClick={() => { setIsHistoryOpen(true); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-left">
                  <Clock size={14} /> Restore Version / History
                </button>
                <button onClick={() => { setShowWelcome(true); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-left">
                  <Sparkles size={14} /> Welcome Tour
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
