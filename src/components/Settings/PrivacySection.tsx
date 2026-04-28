import React from 'react';
// Privacy Section Component
import { Shield, Lock, Fingerprint } from 'lucide-react';
import { SettingsSectionProps } from './types';
import { safeStorage } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export default function PrivacySection({ settings, toggleSetting, t }: SettingsSectionProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Shield className="text-violet-400" /> Privasi & Keamanan
      </h3>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="font-medium text-[var(--text-primary)]">Enkripsi Ham</h4>
              <p className="text-sm text-[var(--text-secondary)] opacity-70">Lindungi data dengan enkripsi tingkat militer</p>
            </div>
          </div>
          <div 
            onClick={() => toggleSetting('encryption')}
            className={`relative inline-block w-12 h-6 transition duration-300 ease-in-out rounded-full cursor-pointer border ${settings.encryption ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow-lg transform transition-transform duration-300 ease-in-out ${settings.encryption ? 'translate-x-6 bg-emerald-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>
        
        <div className="h-px bg-[var(--border-color)]/50" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400 border border-violet-500/20">
              <Fingerprint size={20} />
            </div>
            <div>
              <h4 className="font-medium text-[var(--text-primary)]">Anti-Tracking AI</h4>
              <p className="text-sm text-[var(--text-secondary)] opacity-70">Blokir pelacak dengan kecerdasan buatan</p>
            </div>
          </div>
          <div 
            onClick={() => toggleSetting('antiTracking')}
            className={`relative inline-block w-12 h-6 transition duration-300 ease-in-out rounded-full cursor-pointer border ${settings.antiTracking ? 'bg-violet-500/20 border-violet-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow-lg transform transition-transform duration-300 ease-in-out ${settings.antiTracking ? 'translate-x-6 bg-violet-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]/50" />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Hapus Data Penjelajahan</h4>
            <p className="text-sm text-[var(--text-secondary)] opacity-70">Hapus history, cache, dan cookies</p>
          </div>
          <button 
            onClick={async () => {
              if (await confirm('Hapus semua data browsing dan riwayat AI?')) {
                safeStorage.removeItem('quantum_settings');
                safeStorage.removeItem('ham_studio_state');
                safeStorage.removeItem('ham_current_project');
                // Clear IndexedDB databases
                indexedDB.deleteDatabase('quantum-chat-db');
                indexedDB.deleteDatabase('quantum-brain-db');
                showToast('Data berhasil dihapus. Aplikasi akan dimuat ulang.', 'success');
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }
            }}
            className="px-4 py-2 rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-red-500/30 hover:text-red-400 transition-all active:scale-[0.98]"
          >
            Hapus Data
          </button>
        </div>

        <div className="h-px bg-[var(--border-color)]/50" />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Do Not Track</h4>
            <p className="text-sm text-[var(--text-secondary)] opacity-70">Kirim permintaan DNT dengan lalu lintas browsing</p>
          </div>
          <div 
            onClick={() => toggleSetting('doNotTrack')}
            className={`relative inline-block w-12 h-6 transition duration-300 ease-in-out rounded-full cursor-pointer border ${settings.doNotTrack ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow-lg transform transition-transform duration-300 ease-in-out ${settings.doNotTrack ? 'translate-x-6 bg-emerald-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
