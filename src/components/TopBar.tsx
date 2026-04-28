import React from 'react';
import { MoreVertical, Search, Wifi, WifiOff, Zap, Battery, Info, Trash2, RefreshCw, Power, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemStatsDisplay } from './SystemStatsDisplay';
import { ClockDisplay } from './ClockDisplay';
import MenuButton from './MenuButton';
import { safeStorage } from '../utils/storage';

interface TopBarProps {
  isOnline: boolean;
  batteryLevel: number | null;
  isCharging: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  setShowSystemInfo: (show: boolean) => void;
  confirm: (msg: string) => Promise<boolean>;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  isOnline,
  batteryLevel,
  isCharging,
  isMenuOpen,
  setIsMenuOpen,
  setIsCommandPaletteOpen,
  setShowSystemInfo,
  confirm,
  toggleFullscreen,
  isFullscreen
}) => {
  return (
    <div className="h-9 bg-[var(--bg-secondary)]/90 backdrop-blur-xl border-b border-[var(--border-color)] flex items-center justify-between px-3 z-50 shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 group">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] shadow-[0_0_8px_rgba(255,95,86,0.3)] group-hover:brightness-110 transition-all" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] shadow-[0_0_8px_rgba(255,189,46,0.3)] group-hover:brightness-110 transition-all" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] shadow-[0_0_8px_rgba(39,201,63,0.3)] group-hover:brightness-110 transition-all" />
        </div>
        <div className="h-3 w-px bg-[var(--border-color)] mx-1" />
        <span className="font-mono text-[10px] text-[#00ffcc] tracking-[0.15em] font-bold uppercase opacity-90 text-shadow-glow">HAM OS</span>
        <SystemStatsDisplay />
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${isOnline ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
          {isOnline ? <Wifi size="0.8rem" /> : <WifiOff size="0.8rem" />}
          <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">{isOnline ? 'NET' : 'OFF'}</span>
        </div>

        {batteryLevel !== null && (
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${isCharging ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
            {isCharging ? <Zap size="0.8rem" className="fill-current" /> : <Battery size="0.8rem" className={batteryLevel < 20 ? 'text-red-400' : ''} />}
            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">{batteryLevel}%</span>
          </div>
        )}

        <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center gap-2 px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all text-[10px] font-mono group">
          <Search size="0.8rem" className="group-hover:text-[#00ffcc] transition-colors" />
          <span className="hidden sm:inline">CMD</span>
        </button>

        <ClockDisplay />
        
        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-1 rounded transition-all ${isMenuOpen ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}>
            <MoreVertical size="1.2rem" />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-2 w-56 bg-[var(--bg-secondary)]/95 backdrop-blur-2xl border border-[var(--border-color)] rounded-xl shadow-2xl z-[100] overflow-hidden">
                <div className="p-2 space-y-1">
                  <MenuButton icon={Info} label="System Info" onClick={() => { setShowSystemInfo(true); setIsMenuOpen(false); }} />
                  <div className="h-px bg-[var(--border-color)] my-1" />
                  <MenuButton icon={Trash2} label="Clear Cache" onClick={async () => { if(await confirm('Apakah Anda yakin ingin menghapus semua cache sistem?')) { safeStorage.clear(); window.location.reload(); } }} />
                  <MenuButton icon={RefreshCw} label="Reboot System" onClick={async () => { if(await confirm('Apakah Anda yakin ingin melakukan reboot sistem?')) window.location.reload(); }} />
                  <div className="h-px bg-[var(--border-color)] my-1" />
                  <MenuButton icon={Power} label="Shutdown" variant="danger" onClick={async () => { if(await confirm('Apakah Anda yakin ingin mematikan Ham OS?')) window.close(); }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={toggleFullscreen} className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-md transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          {isFullscreen ? <Minimize size="1.2rem" /> : <Maximize size="1.2rem" />}
        </button>
      </div>
    </div>
  );
};
