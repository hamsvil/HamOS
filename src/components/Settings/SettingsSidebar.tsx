 
import React from 'react';
// Settings Sidebar Component
import { Settings, Globe, Key, Shield, Monitor, Cpu, Lock, Download, Info, Database, ChevronLeft, Smartphone } from 'lucide-react';

interface SettingsSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  t: (key: string) => string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function SettingsSidebar({ activeSection, setActiveSection, t, isSidebarOpen, setIsSidebarOpen }: SettingsSidebarProps) {
  const menuItems = [
    { id: 'general', icon: Globe, label: t('settings.general') },
    { id: 'api', icon: Key, label: 'Konfigurasi API' },
    { id: 'privacy', icon: Shield, label: 'Privasi & Keamanan' },
    { id: 'appearance', icon: Monitor, label: 'Tampilan & Tema' },
    { id: 'performance', icon: Cpu, label: 'Kinerja Sistem' },
    { id: 'content', icon: Lock, label: 'Konten & Izin Situs' },
    { id: 'autofill', icon: Key, label: 'Isi Otomatis' },
    { id: 'downloads', icon: Download, label: 'Download' },
    { id: 'deploy', icon: Smartphone, label: 'Native Build & Deploy' },
    { id: 'about', icon: Info, label: 'Tentang Ham OS' },
    { id: 'brain', icon: Database, label: 'Install Otak Lokal (GGUF)' },
  ];

  return (
    <div className={`absolute inset-y-0 left-0 z-40 w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] p-5 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:bg-[var(--bg-secondary)]/60 flex flex-col backdrop-blur-md`}>
      <div className="flex items-center justify-between mb-10 px-2 shrink-0">
        <div className="flex items-center gap-3 text-violet-400">
          <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20 shadow-[0_0_15px_rgba(167,139,250,0.1)]">
            <Settings size={20} className="animate-spin-slow" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-black tracking-[0.2em] text-sm uppercase">{t('settings.title')}</h2>
            <span className="text-[8px] text-violet-400/60 font-mono uppercase tracking-widest">Quantum V7.2.0</span>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
          <ChevronLeft size={20} />
        </button>
      </div>
      
      <div className="space-y-1.5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent pr-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveSection(item.id);
              if (window.innerWidth < 768) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
              activeSection === item.id
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-[0_0_20px_rgba(167,139,250,0.15)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-transparent'
            }`}
          >
            <item.icon size={18} className={`transition-transform duration-300 ${activeSection === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="font-bold text-xs uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
