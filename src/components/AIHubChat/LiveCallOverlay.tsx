import React from 'react';
import { BrainCircuit, Phone, MicOff } from 'lucide-react';

interface LiveCallOverlayProps {
  isLiveCall: boolean;
  setIsLiveCall: (val: boolean) => void;
  liveCallStatus: string;
}

export const LiveCallOverlay: React.FC<LiveCallOverlayProps> = ({
  isLiveCall,
  setIsLiveCall,
  liveCallStatus
}) => {
  if (!isLiveCall) return null;

  return (
    <div className="absolute inset-0 z-[100] bg-[var(--bg-primary)]/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-[#00ffcc]/20 blur-3xl rounded-full animate-pulse" />
        <div className="w-48 h-48 rounded-full border-2 border-[#00ffcc]/50 flex items-center justify-center relative z-10">
          <BrainCircuit size={80} className="text-[#00ffcc] animate-pulse" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 tracking-widest">HAM QUANTUM LIVE CALL</h2>
      <p className="text-[#00ffcc] font-mono text-xs mb-12 animate-pulse uppercase tracking-[0.2em]">{liveCallStatus}</p>
      
      <div className="flex gap-8">
        <button onClick={() => setIsLiveCall(false)} className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
          <Phone size={24} className="rotate-[135deg]" />
        </button>
        <button className="w-16 h-16 rounded-full bg-[#00ffcc]/20 border border-[#00ffcc]/50 flex items-center justify-center text-[#00ffcc] hover:bg-[#00ffcc] hover:text-black transition-all">
          <MicOff size={24} />
        </button>
      </div>
    </div>
  );
};
