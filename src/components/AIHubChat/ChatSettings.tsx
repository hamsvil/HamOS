 
import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface ChatSettingsProps {
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  externalApiKey: string;
  setExternalApiKey: (val: string) => void;
   
  safeStorage: any;
  customInstruction: string;
  setCustomInstruction: (val: string) => void;
}

export const ChatSettings: React.FC<ChatSettingsProps> = ({
  showSettings,
  setShowSettings,
  externalApiKey,
  setExternalApiKey,
  safeStorage,
  customInstruction,
  setCustomInstruction
}) => {
  if (!showSettings) return null;

  return (
    <div className="absolute top-16 left-4 right-4 z-40 bg-[var(--bg-secondary)]/95 border border-[#00ffcc]/30 rounded-xl p-4 animate-in slide-in-from-top-2 shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm text-[#00ffcc] font-mono font-bold uppercase tracking-widest">Sistem Konfigurasi Quantum</h3>
        <button onClick={() => setShowSettings(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 hover:bg-[var(--bg-tertiary)] rounded-full transition-all"><X size={16} /></button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] text-[var(--text-secondary)] font-mono mb-1.5 uppercase tracking-wider">External API Key (Ham Engine)</label>
          <div className="relative">
            <input
              type="password"
              value={externalApiKey}
              onChange={(e) => {
                const val = e.target.value;
                setExternalApiKey(val);
                safeStorage.setItem('ham_alternate_api_key', val);
              }}
              className="w-full bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] text-xs focus:border-[#00ffcc] outline-none font-mono pr-10"
              placeholder="Masukkan API Key eksternal Anda..."
            />
            <ShieldCheck size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 ${externalApiKey ? 'text-emerald-400' : 'text-[var(--text-secondary)]/20'}`} />
          </div>
          <p className="text-[9px] text-[var(--text-secondary)]/30 mt-1 font-mono italic">* Digunakan jika Hardware Bridge (API Key Bawaan) sedang sibuk atau limit.</p>
        </div>

        <div>
          <label className="block text-[10px] text-[var(--text-secondary)] font-mono mb-1.5 uppercase tracking-wider">Instruksi Permanen Manual (Suntikan Memori)</label>
          <textarea
            value={customInstruction}
            onChange={(e) => {
              const val = e.target.value;
              setCustomInstruction(val);
              safeStorage.setItem('quantum_custom_instruction', val);
            }}
            className="w-full bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] rounded-lg p-3 text-[var(--text-primary)] text-xs focus:border-[#00ffcc] outline-none h-24 font-mono custom-scrollbar"
            placeholder="Masukkan instruksi khusus yang akan selalu diingat oleh AI..."
          />
        </div>

        <div className="pt-2 border-t border-[var(--border-color)]">
          <button 
            onClick={() => {
              setShowSettings(false);
            }}
            className="w-full py-2 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/30 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all"
          >
            Simpan & Sinkronisasi Quantum
          </button>
        </div>
      </div>
    </div>
  );
};
