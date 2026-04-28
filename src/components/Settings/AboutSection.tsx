import React from 'react';
// About Section Component
import { Info, Globe } from 'lucide-react';

export default function AboutSection() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-4 uppercase tracking-tighter">
          <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <Info className="text-violet-400" size={24} />
          </div>
          Tentang Ham OS
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">System Stable</span>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-10 text-center space-y-8 relative overflow-hidden shadow-2xl group">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl group-hover:bg-violet-500/10 transition-all duration-1000" />
        
        <div className="w-32 h-32 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto border border-violet-500/30 shadow-[0_0_50px_rgba(167,139,250,0.2)] relative">
          <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-ping opacity-20" />
          <Globe size={64} className="text-violet-400 animate-pulse-slow" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-4xl font-black text-[var(--text-primary)] tracking-[0.3em] uppercase">HAM QUANTUM OS</h2>
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-violet-500/50" />
            <p className="text-violet-400 font-mono text-xs font-black tracking-[0.4em] uppercase">VERSION 7.2.0 (QUANTUM)</p>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-violet-500/50" />
          </div>
        </div>

        <div className="max-w-xl mx-auto text-[var(--text-secondary)] text-sm leading-relaxed font-medium opacity-80">
          Sistem operasi berbasis web generasi berikutnya yang mengintegrasikan kecerdasan buatan tingkat lanjut, komputasi kuantum terdistribusi, dan antarmuka futuristik untuk pengalaman browsing tanpa batas.
        </div>

        <div className="pt-6 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest opacity-50">Engine</span>
            <span className="text-xs font-black text-violet-400 uppercase">Singularity v7</span>
          </div>
          <div className="h-8 w-px bg-[var(--border-color)]" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest opacity-50">Kernel</span>
            <span className="text-xs font-black text-violet-400 uppercase">Quantum-X</span>
          </div>
          <div className="h-8 w-px bg-[var(--border-color)]" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest opacity-50">Build</span>
            <span className="text-xs font-black text-violet-400 uppercase">2026.03.18</span>
          </div>
        </div>
      </div>
    </div>
  );
}
