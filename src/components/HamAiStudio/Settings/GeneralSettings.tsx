 
import React from 'react';
import { Code, Palette, RefreshCw } from 'lucide-react';
import { SettingsSection } from './SettingsSection';

interface GeneralSettingsProps {
  projectType: string;
  setProjectType: (value: string) => void;
  theme: string;
  setTheme: (value: any) => void;
  editorTheme: string;
  setEditorTheme: (value: string) => void;
  showMinimap: boolean;
  setShowMinimap: (value: boolean) => void;
  performanceMode: boolean;
  setPerformanceMode: (value: boolean) => void;
  fontSize: number;
  setFontSize: (value: number) => void;
  stealthMode: boolean;
  setStealthMode: (value: boolean) => void;
  handleClearNativeData: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  projectType,
  setProjectType,
  theme,
  setTheme,
  editorTheme,
  setEditorTheme,
  showMinimap,
  setShowMinimap,
  performanceMode,
  setPerformanceMode,
  fontSize,
  setFontSize,
  stealthMode,
  setStealthMode,
  handleClearNativeData
}) => {
  return (
    <>
      <SettingsSection title="Project Settings" icon={<Code size={16} />}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Default Project Type</label>
            <select 
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
            >
              <option value="apk">Create APK (Native)</option>
              <option value="web">Create App (Website)</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Appearance" icon={<Palette size={16} />}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Theme</label>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
            >
              <option value="dark">Ham (Dark)</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Editor Theme</label>
            <select 
              value={editorTheme}
              onChange={(e) => setEditorTheme(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
            >
              <option value="vs-dark">Visual Studio Dark</option>
              <option value="light">Visual Studio Light</option>
              <option value="hc-black">High Contrast Black</option>
            </select>
          </div>

          <div className="flex items-center justify-between bg-[var(--bg-tertiary)] p-2 rounded-md border border-[var(--border-color)]">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--text-primary)]">Show Minimap</span>
              <span className="text-[10px] text-[var(--text-secondary)]">Display code minimap on the right</span>
            </div>
            <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
              <input 
                type="checkbox" 
                name="minimap-toggle" 
                id="minimap-toggle" 
                checked={showMinimap}
                onChange={(e) => setShowMinimap(e.target.checked)}
                className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-blue-600"
              />
              <label htmlFor="minimap-toggle" className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer transition-colors ${showMinimap ? 'bg-blue-600' : 'bg-gray-300'}`}></label>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[var(--bg-tertiary)] p-2 rounded-md border border-[var(--border-color)]">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--text-primary)]">Performance Mode</span>
              <span className="text-[10px] text-[var(--text-secondary)]">Disable blur & animations (Save Battery)</span>
            </div>
            <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
              <input 
                type="checkbox" 
                name="toggle" 
                id="performance-toggle" 
                checked={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.checked)}
                className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-blue-600"
              />
              <label htmlFor="performance-toggle" className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer transition-colors ${performanceMode ? 'bg-blue-600' : 'bg-gray-300'}`}></label>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[var(--bg-tertiary)] p-2 rounded-md border border-[var(--border-color)]">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--text-primary)]">Stealth Mode</span>
              <span className="text-[10px] text-[var(--text-secondary)]">Hide app from task switcher & clear cache</span>
            </div>
            <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
              <input 
                type="checkbox" 
                name="stealth-toggle" 
                id="stealth-toggle" 
                checked={stealthMode}
                onChange={(e) => setStealthMode(e.target.checked)}
                className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-blue-600"
              />
              <label htmlFor="stealth-toggle" className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer transition-colors ${stealthMode ? 'bg-blue-600' : 'bg-gray-300'}`}></label>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Editor Font Size ({fontSize}px)</label>
            <input 
              type="range" 
              min="10" 
              max="24" 
              step="1"
              value={fontSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                setFontSize(newSize);
                // Live preview: dispatch event immediately
                window.dispatchEvent(new CustomEvent('ham-settings-changed', {
                  detail: {
                    fontSize: newSize,
                    editorTheme,
                    showMinimap
                  }
                }));
              }}
              className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1">
              <span>Tiny (10px)</span>
              <span>Normal (14px)</span>
              <span>Huge (24px)</span>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Native Maintenance" icon={<RefreshCw size={16} />}>
        <div className="space-y-3">
          <p className="text-[10px] text-[var(--text-secondary)]">
            Maintenance tools for the native Android environment.
          </p>
          <button 
            onClick={handleClearNativeData}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-md transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            Clear Native Browser Data
          </button>
        </div>
      </SettingsSection>
    </>
  );
};
