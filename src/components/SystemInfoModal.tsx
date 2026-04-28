import React from 'react';
import { Cpu, Info, Trash2, RefreshCw, Power } from 'lucide-react';

interface SystemInfoModalProps {
  onClose: () => void;
  systemStats: { cpu: number; ram: number; disk: number };
  batteryLevel: number | null;
  isCharging: boolean;
  isOnline: boolean;
}

export default function SystemInfoModal({ onClose, systemStats, batteryLevel, isCharging, isOnline }: SystemInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#00ffcc]/10 rounded-2xl flex items-center justify-center border border-[#00ffcc]/30">
              <Cpu size={32} className="text-[#00ffcc]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Ham Quantum OS</h3>
              <p className="text-[#00ffcc] text-xs font-mono tracking-widest uppercase">Version 1.0.0 Stable</p>
            </div>
          </div>

          <div className="space-y-3">
            <InfoRow label="Kernel" value="Ham-Linux 5.15.0-q" />
            <InfoRow label="Architecture" value="Quantum-v8a (64-bit)" />
            <InfoRow label="Memory" value={`${(navigator as any).deviceMemory || 8} GB RAM`} />
            <InfoRow label="Cores" value={`${navigator.hardwareConcurrency || 4} Logical Processors`} />
            <InfoRow label="Runtime" value="V8 Engine / Native Bridge" />
            <InfoRow label="Battery" value={batteryLevel ? `${batteryLevel}% ${isCharging ? '(Charging)' : ''}` : 'N/A'} />
            <InfoRow label="Network" value={isOnline ? 'Online' : 'Offline'} />
          </div>

          <button 
            onClick={onClose}
            className="w-full py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-primary)] transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)]/30">
      <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
      <span className="text-sm text-[var(--text-primary)] font-mono">{value}</span>
    </div>
  );
}
