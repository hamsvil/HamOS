import React from 'react';
// API Section Component
import { Key, Info, ExternalLink, Save } from 'lucide-react';
import { ApiSectionProps } from './types';

export default function ApiSection({ apiKeys, handleApiKeyChange, saveApiKeys }: ApiSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Key className="text-violet-400" /> Konfigurasi API
      </h3>
      
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-6 shadow-xl shadow-black/20">
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-start gap-3 backdrop-blur-sm">
          <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-blue-200/80">
            API Key disimpan secara lokal di browser Anda (LocalStorage) dan tidak pernah dikirim ke server kami selain ke penyedia layanan terkait (Google, GitHub, dll).
          </p>
        </div>

        {/* Ham Engine API */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)] flex justify-between">
            <span>Ham Engine API Key</span>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors text-xs flex items-center gap-1">
              Dapatkan Key <ExternalLink size={10} />
            </a>
          </label>
          <input 
            type="password" 
            value={apiKeys.gemini}
            onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
            placeholder="Masukkan Ham Engine API Key..."
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:border-violet-500/50 outline-none text-[var(--text-primary)] font-mono transition-all"
          />
          <p className="text-xs text-[var(--text-secondary)] opacity-60">Diperlukan untuk fitur AI Chat dan Ham Engine.</p>
        </div>

        {/* GitHub Token */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)] flex justify-between">
            <span>GitHub Personal Access Token</span>
            <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors text-xs flex items-center gap-1">
              Buat Token <ExternalLink size={10} />
            </a>
          </label>
          <input 
            type="password" 
            value={apiKeys.github}
            onChange={(e) => handleApiKeyChange('github', e.target.value)}
            placeholder="ghp_..."
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:border-violet-500/50 outline-none text-[var(--text-primary)] font-mono transition-all"
          />
          <p className="text-xs text-[var(--text-secondary)] opacity-60">Diperlukan untuk sinkronisasi proyek ke GitHub.</p>
        </div>

        {/* Supabase (Optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)]">Supabase URL (Opsional)</label>
          <input 
            type="text" 
            value={apiKeys.supabaseUrl}
            onChange={(e) => handleApiKeyChange('supabaseUrl', e.target.value)}
            placeholder="https://xyz.supabase.co"
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:border-violet-500/50 outline-none text-[var(--text-primary)] font-mono transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--text-primary)]">Supabase Anon Key (Opsional)</label>
          <input 
            type="password" 
            value={apiKeys.supabaseKey}
            onChange={(e) => handleApiKeyChange('supabaseKey', e.target.value)}
            placeholder="eyJ..."
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:border-violet-500/50 outline-none text-[var(--text-primary)] font-mono transition-all"
          />
          <p className="text-xs text-[var(--text-secondary)] opacity-60">Untuk penyimpanan cloud proyek (Cloud Storage).</p>
        </div>

        <div className="pt-4 border-t border-[var(--border-color)]/50 flex justify-end">
          <button 
            onClick={saveApiKeys}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          >
            <Save size={18} />
            Simpan & Sinkronisasi
          </button>
        </div>
      </div>
    </div>
  );
}
