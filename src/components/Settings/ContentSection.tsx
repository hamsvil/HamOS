import React from 'react';
// Content Section Component
import { Lock, Camera, Mic, MapPin, Bell } from 'lucide-react';
import { SettingsSectionProps } from './types';

export default function ContentSection({ settings, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Lock className="text-[#00ffcc]" /> Konten & Izin Situs
      </h3>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">JavaScript</h4>
            <p className="text-sm text-[var(--text-secondary)]">Izinkan situs menjalankan skrip (Disarankan)</p>
          </div>
          <div 
            onClick={() => toggleSetting('javascript')}
            className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings.javascript ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings.javascript ? 'translate-x-6 bg-emerald-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]" />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Pop-ups & Redirects</h4>
            <p className="text-sm text-[var(--text-secondary)]">Blokir jendela pop-up yang mengganggu</p>
          </div>
          <div 
            onClick={() => toggleSetting('popups')}
            className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings.popups ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings.popups ? 'translate-x-6 bg-emerald-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]" />
        <h4 className="font-bold text-[#00ffcc] text-sm uppercase tracking-wider mt-4 mb-2">Izin Perangkat</h4>

        {[
          { key: 'cameraAccess', label: 'Kamera', icon: Camera },
          { key: 'microphoneAccess', label: 'Mikrofon', icon: Mic },
          { key: 'locationAccess', label: 'Lokasi', icon: MapPin },
          { key: 'notifications', label: 'Notifikasi', icon: Bell },
        ].map((perm) => (
          <div key={perm.key} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-secondary)]">
                {perm.key === 'notifications' ? <Bell size={18} /> : perm.key === 'locationAccess' ? <MapPin size={18} /> : <perm.icon size={18} />}
              </div>
              <div>
                <h4 className="font-medium text-[var(--text-primary)]">{perm.label}</h4>
                <p className="text-sm text-[var(--text-secondary)]">Tanya sebelum mengakses</p>
              </div>
            </div>
            <div 
              onClick={() => toggleSetting(perm.key as any)}
              className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings[perm.key as keyof typeof settings] ? 'bg-blue-500/20 border-blue-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
            >
              <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings[perm.key as keyof typeof settings] ? 'translate-x-6 bg-blue-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
