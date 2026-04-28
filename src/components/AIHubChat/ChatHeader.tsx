import React from 'react';
import { Clock, RefreshCw, ShieldCheck, Zap, History, AlertTriangle, Activity, Database } from 'lucide-react';
import { CLONES } from '../../constants/aiClones';
import { useAIHubStore } from '../../store/aiHubStore';

interface ChatHeaderProps {
  setShowHistory: (val: boolean) => void;
  onOpenRestore: () => void;
  handleSyncMemory: () => void;
  onOpenVault: () => void;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'success';
  activeClone: typeof CLONES[0];
  singularityMode: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  setShowHistory,
  onOpenRestore,
  handleSyncMemory,
  onOpenVault,
  isLoading,
  syncStatus,
  activeClone,
  singularityMode
}) => {
  const { lastError } = useAIHubStore();

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
      <button 
        onClick={() => setShowHistory(true)}
        className="p-2 bg-[var(--bg-secondary)]/40 border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[#00ffcc] hover:border-[#00ffcc]/30 transition-all pointer-events-auto"
        title="Riwayat Percakapan"
      >
        <Clock size={18} />
      </button>
      <button 
        onClick={onOpenRestore}
        className="p-2 bg-[var(--bg-secondary)]/40 border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[#00ffcc] hover:border-[#00ffcc]/30 transition-all pointer-events-auto"
        title="Restore Version"
      >
        <History size={18} />
      </button>
      <button 
        onClick={onOpenVault}
        className="p-2 bg-[var(--bg-secondary)]/40 border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[#00ffcc] hover:border-[#00ffcc]/30 transition-all pointer-events-auto"
        title="Document Vault"
      >
        <Database size={18} />
      </button>
      <button 
        onClick={handleSyncMemory}
        disabled={isLoading}
        className={`p-2 bg-[var(--bg-secondary)]/40 border rounded-lg transition-all pointer-events-auto flex items-center gap-2 text-[10px] font-mono ${
          syncStatus === 'success' 
            ? 'border-emerald-500 text-emerald-400' 
            : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#00ffcc] hover:border-[#00ffcc]/30'
        }`}
        title="Sinkronisasi Memori Inti"
      >
        {syncStatus === 'syncing' ? (
          <RefreshCw size={18} className="animate-spin" />
        ) : syncStatus === 'success' ? (
          <ShieldCheck size={18} />
        ) : (
          <Zap size={18} />
        )}
        <span className="hidden sm:inline">{syncStatus === 'syncing' ? 'SYNCING...' : syncStatus === 'success' ? 'MEMORY SYNCED' : 'SYNC MEMORY'}</span>
      </button>
      <div className="pointer-events-none">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-[var(--text-secondary)]/30 font-bold text-[9px] tracking-widest uppercase">Ham Quantum Intelligence</h3>
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${lastError ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'} transition-all`}>
            {lastError ? <AlertTriangle size={8} /> : <Activity size={8} />}
            <span className="text-[7px] font-black uppercase tracking-widest">{lastError ? 'System Alert' : 'Engine Secured'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <p className="text-[#00ffcc]/30 text-[9px] font-mono">{activeClone.model} :: {singularityMode ? 'SINGULARITY' : 'STANDARD'}</p>
            {activeClone.id === 'hamli' && (
                <span className="text-[8px] bg-[#00ffcc]/10 text-[#00ffcc] px-1 rounded border border-[#00ffcc]/20 animate-pulse font-mono">
                    100.000.000+ ACTIVE CLONES
                </span>
            )}
        </div>
      </div>
    </div>
  );
};
