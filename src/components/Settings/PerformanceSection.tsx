 
import React from 'react';
// Performance Section Component
import { Cpu } from 'lucide-react';
import { SettingsSectionProps } from './types';

export default function PerformanceSection({ settings, handleSave, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Cpu className="text-[#00ffcc]" /> Kinerja Sistem
      </h3>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
            <div className="text-xs text-[var(--text-secondary)] uppercase mb-1">CPU Cores</div>
            <div className="text-xl font-bold text-[#00ffcc]">{navigator.hardwareConcurrency || 'N/A'}</div>
          </div>
          <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
            <div className="text-xs text-[var(--text-secondary)] uppercase mb-1">Device Memory</div>
            <div className="text-xl font-bold text-[#00ffcc]">{(navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'N/A'}</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">JS Heap Usage</span>
            <span className="text-sm text-[#00ffcc]">
              {(performance as any).memory ? `${Math.round(((performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit) * 100)}%` : 'Active'}
            </span>
          </div>
          <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-[#00ffcc] transition-all duration-1000" 
              style={{ width: (performance as any).memory ? `${Math.round(((performance as any).memory.usedJSHeapSize / (performance as any).memory.jsHeapSizeLimit) * 100)}%` : '50%' }}
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Mode Performa Tinggi</h4>
            <p className="text-sm text-[var(--text-secondary)]">Nonaktifkan blur dan animasi untuk menghemat baterai</p>
          </div>
          <div 
            onClick={() => {
                const newVal = !settings.reducedMotion;
                handleSave({ ...settings, reducedMotion: newVal });
                if (newVal) {
                    document.documentElement.classList.add('reduce-motion');
                } else {
                    document.documentElement.classList.remove('reduce-motion');
                }
            }}
            className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings.reducedMotion ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings.reducedMotion ? 'translate-x-6 bg-emerald-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]" />

        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Akselerasi GPU</h4>
            <p className="text-sm text-[var(--text-secondary)]">Gunakan hardware acceleration untuk render 3D</p>
          </div>
          <div 
            onClick={() => toggleSetting('gpuAcceleration')}
            className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings.gpuAcceleration ? 'bg-purple-500/20 border-purple-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings.gpuAcceleration ? 'translate-x-6 bg-purple-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]" />

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-[var(--text-primary)]">Alokasi RAM AI</h4>
              <p className="text-sm text-[var(--text-secondary)]">Batas memori untuk model AI lokal (WebLLM)</p>
            </div>
            <span className="text-lg font-bold text-[#00ffcc]">{settings.aiRamLimit} GB</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="16" 
            step="1"
            value={settings.aiRamLimit}
            onChange={(e) => handleSave({ ...settings, aiRamLimit: parseInt(e.target.value) })}
            className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[#00ffcc]"
          />
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>1 GB</span>
            <span>Default (2 GB)</span>
            <span>16 GB</span>
          </div>
        </div>

        <div className="h-px bg-[var(--border-color)]" />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">Mode Pengembang</h4>
            <p className="text-sm text-[var(--text-secondary)]">Aktifkan alat debugging dan metrik lanjutan</p>
          </div>
          <div 
            onClick={() => toggleSetting('developerMode')}
            className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer border ${settings.developerMode ? 'bg-purple-500/20 border-purple-500/50' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
          >
            <span className={`absolute left-0 inline-block w-6 h-6 border rounded-full shadow transform transition-transform duration-200 ease-in-out ${settings.developerMode ? 'translate-x-6 bg-purple-400 border-white' : 'translate-x-0 bg-[var(--text-secondary)] border-[var(--border-color)]'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
