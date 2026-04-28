import React from 'react';
// Download Section Component
import { Download } from 'lucide-react';
import { SettingsSectionProps } from './types';

export default function DownloadSection({ settings, handleSave, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Download className="text-[#00ffcc]" /> Download
      </h3>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
        <div>
          <h4 className="font-medium text-[var(--text-primary)] mb-2">Lokasi</h4>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={settings.downloadPath}
              onChange={(e) => handleSave({ ...settings, downloadPath: e.target.value })}
              className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:border-[#00ffcc] outline-none text-[var(--text-primary)] font-mono"
            />
            <button className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)]">
              Ubah
            </button>
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]" />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Tanya lokasi penyimpanan</h4>
            <p className="text-sm text-[var(--text-secondary)]">Tanya lokasi penyimpanan setiap sebelum mendownload</p>
          </div>
          <div 
            onClick={() => toggleSetting('askWhereToSave')}
            className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings.askWhereToSave ? 'bg-blue-500/20 border-blue-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings.askWhereToSave ? 'translate-x-6 bg-blue-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
