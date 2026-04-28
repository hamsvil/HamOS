import React from 'react';
import { Menu, ChevronUp, BrainCircuit, Settings } from 'lucide-react';
import { CLONES } from '../../constants/aiClones';

interface CloneSelectorProps {
  activeClone: typeof CLONES[0];
  setActiveClone: (clone: typeof CLONES[0]) => void;
  isCloneMenuOpen: boolean;
  setIsCloneMenuOpen: (isOpen: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

export default function CloneSelector({
  activeClone,
  setActiveClone,
  isCloneMenuOpen,
  setIsCloneMenuOpen,
  showSettings,
  setShowSettings
}: CloneSelectorProps) {
  return (
    <div className={`absolute top-3 right-3 z-50 transition-all duration-300 ${isCloneMenuOpen ? 'w-64' : 'w-auto'}`}>
      <div className="bg-black/80 backdrop-blur-xl border border-[#00ffcc]/30 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
        <div 
          className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5"
          onClick={() => setIsCloneMenuOpen(!isCloneMenuOpen)}
        >
          <div className="flex items-center gap-2 text-[#00ffcc]">
            <activeClone.icon size={16} />
            {isCloneMenuOpen && <span className="font-bold text-xs">{activeClone.name}</span>}
          </div>
          {isCloneMenuOpen ? <ChevronUp size={14} className="text-white/50" /> : <Menu size={16} className="text-[#00ffcc]" />}
        </div>

        {isCloneMenuOpen && (
          <div className="max-h-[60vh] overflow-y-auto p-2 border-t border-white/10 space-y-1">
            <div className="px-2 py-1 text-xs font-mono text-white/40 uppercase">Mode</div>
            <div className="w-full flex items-center gap-2 p-2 rounded-lg text-xs mb-2 bg-purple-500/20 text-purple-400 border border-purple-500/50 cursor-default">
              <BrainCircuit size={14} />
              <span>Singularity Mode (Always Active)</span>
            </div>
            
            <div className="px-2 py-1 text-xs font-mono text-white/40 uppercase mt-2">Clones</div>
            {CLONES.map(clone => (
              <button
                key={clone.id}
                onClick={() => {
                  setActiveClone(clone);
                  setIsCloneMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${activeClone.id === clone.id ? 'bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/50' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
              >
                <div className={`p-1.5 rounded-lg bg-white/5 ${activeClone.id === clone.id ? 'text-[#00ffcc]' : 'text-white/40'}`}>
                  <clone.icon size={16} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{clone.name}</div>
                  <div className="text-[9px] text-white/40 truncate leading-tight">{(clone as any).desc || 'Quantum AI Persona'}</div>
                </div>
              </button>
            ))}
            
            <div className="px-2 py-1 text-xs font-mono text-white/40 uppercase mt-2">Settings</div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center gap-2 p-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all text-xs"
            >
              <Settings size={14} />
              <span>Instruksi Manual</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
