import React from 'react';
// Appearance Section Component
import { Monitor, Sun, Moon } from 'lucide-react';
import { AppearanceSectionProps } from './types';

export default function AppearanceSection({ settings, handleSave, theme, setTheme }: AppearanceSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Monitor className="text-violet-400" /> Tampilan & Tema
      </h3>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-6 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Mode Tema</h4>
            <p className="text-sm text-[var(--text-secondary)] opacity-70">Pilih tampilan terang atau gelap</p>
          </div>
          <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-1 shadow-inner">
            <button
              onClick={() => setTheme('light')}
              className={`p-2 rounded-md transition-all duration-300 ${theme === 'light' ? 'bg-white text-black shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Light Mode"
            >
              <Sun size={18} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-2 rounded-md transition-all duration-300 ${theme === 'dark' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Dark Mode"
            >
              <Moon size={18} />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-2 rounded-md transition-all duration-300 ${theme === 'system' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="System Default"
            >
              <Monitor size={18} />
            </button>
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]/50" />

        <div>
          <h4 className="font-medium text-[var(--text-primary)] mb-3">Tema Warna (Aksen)</h4>
          <div className="grid grid-cols-3 gap-4">
            {['Neon Cyberpunk', 'Deep Space', 'Minimal Glass'].map((t) => (
              <div 
                key={t} 
                onClick={() => handleSave({ ...settings, theme: t })}
                className={`aspect-video bg-[var(--bg-tertiary)] border rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 group ${settings.theme === t ? 'border-violet-500 shadow-lg shadow-violet-500/10' : 'border-[var(--border-color)] hover:border-violet-500/30'}`}
              >
                <div className={`w-full h-20 bg-gradient-to-br rounded-lg transition-all duration-500 ${t === 'Neon Cyberpunk' ? 'from-violet-600/20 to-blue-600/20' : t === 'Deep Space' ? 'from-blue-900/50 to-black/50' : 'from-[var(--bg-secondary)] to-[var(--bg-tertiary)]'}`} />
                <span className={`text-sm font-medium transition-colors ${settings.theme === t ? 'text-violet-400' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]/50" />

        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Mode Tampilan</h4>
            <p className="text-sm text-[var(--text-secondary)] opacity-70">Pilih tata letak antarmuka</p>
          </div>
          <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-1 shadow-inner">
            {['mobile', 'tablet', 'desktop'].map((mode) => (
              <button
                key={mode}
                onClick={() => handleSave({ ...settings, layoutMode: mode })}
                className={`px-3 py-1 rounded text-xs capitalize transition-all duration-300 ${settings.layoutMode === mode ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]/50" />

        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Ukuran Font</h4>
            <p className="text-sm text-[var(--text-secondary)] opacity-70">Sesuaikan ukuran teks antarmuka</p>
          </div>
          <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-1 shadow-inner">
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                onClick={() => handleSave({ ...settings, fontSize: size })}
                className={`px-3 py-1 rounded text-xs capitalize transition-all duration-300 ${settings.fontSize === size ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
