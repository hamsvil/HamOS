import React from 'react';
import { GripHorizontal } from 'lucide-react';
import { useAppDrawerStore } from '../store/appDrawerStore';

interface BottomDockProps {
  isDockMinimized: boolean;
  setIsDockMinimized: (minimized: boolean) => void;
}

export default function BottomDock({ isDockMinimized, setIsDockMinimized }: BottomDockProps) {
  const { toggleDrawer, isOpen } = useAppDrawerStore();

  return (
    <div 
      className={`absolute left-1/2 -translate-x-1/2 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border border-[var(--border-color)] rounded-[2rem] flex items-center justify-center p-2 shadow-[0_10px_40px_rgba(0,0,0,0.4)] z-50 transition-all duration-500 mb-[env(safe-area-inset-bottom,0px)] ${
        isDockMinimized ? 'bottom-[-50px] hover:bottom-3 opacity-50 hover:opacity-100' : 'bottom-4'
      }`}
    >
      <button
        onClick={toggleDrawer}
        aria-label="Open App Menu"
        className={`group relative p-4 rounded-full transition-all duration-300 ${
          isOpen
            ? 'bg-[#00ffcc] text-black shadow-[0_0_20px_rgba(0,255,204,0.5)] scale-110' 
            : 'bg-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
        }`}
      >
        <GripHorizontal size="2rem" strokeWidth={isOpen ? 2.5 : 2} />
      </button>
    </div>
  );
}
