import React from 'react';
// Autofill Section Component
import { Key } from 'lucide-react';
import { SettingsSectionProps } from './types';

export default function AutofillSection({ settings, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Key className="text-[#00ffcc]" /> Isi Otomatis
      </h3>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Sandi</h4>
            <p className="text-sm text-[var(--text-secondary)]">Simpan dan isi sandi secara otomatis</p>
          </div>
          <div 
            onClick={() => toggleSetting('autofillPasswords')}
            className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings.autofillPasswords ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings.autofillPasswords ? 'translate-x-6 bg-emerald-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]" />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Alamat & Lainnya</h4>
            <p className="text-sm text-[var(--text-secondary)]">Simpan dan isi alamat secara otomatis</p>
          </div>
          <div 
            onClick={() => toggleSetting('autofillAddresses')}
            className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings.autofillAddresses ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings.autofillAddresses ? 'translate-x-6 bg-emerald-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
