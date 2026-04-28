 
import React, { useState, lazy, Suspense } from 'react';
import { Menu, Activity, Loader2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useBrain } from '../hooks/useBrain';
import { useSupremeProtocol } from '../hooks/useSupremeProtocol';
import SettingsSidebar from './Settings/SettingsSidebar';

// Lazy load sections
const GeneralSection = lazy(() => import('./Settings/GeneralSection'));
const ApiSection = lazy(() => import('./Settings/ApiSection'));
const PrivacySection = lazy(() => import('./Settings/PrivacySection'));
const AppearanceSection = lazy(() => import('./Settings/AppearanceSection'));
const PerformanceSection = lazy(() => import('./Settings/PerformanceSection'));
const ContentSection = lazy(() => import('./Settings/ContentSection'));
const AutofillSection = lazy(() => import('./Settings/AutofillSection'));
const DownloadSection = lazy(() => import('./Settings/DownloadSection'));
const DeploySection = lazy(() => import('./Settings/DeploySection'));
const AboutSection = lazy(() => import('./Settings/AboutSection'));
const BrainSection = lazy(() => import('./Settings/BrainSection'));

const SectionLoader = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
    <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest animate-pulse">
      Loading Module...
    </span>
  </div>
);

export default function SettingsTab() {
  useSupremeProtocol();
  const { settings, handleSave, apiKeys, handleApiKeyChange, saveApiKeys, toggleSetting, theme, setTheme, language, setLanguage, t } = useSettings();
  const brain = useBrain();
  const [activeSection, setActiveSection] = useState('general');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  React.useEffect(() => {
    const handleChangeSection = (e: Event) => {
      const customEvent = e as CustomEvent<{ section: string }>;
      if (customEvent.detail?.section) {
        setActiveSection(customEvent.detail.section);
      }
    };
    window.addEventListener('ham-change-settings-section', handleChangeSection as EventListener);
    return () => window.removeEventListener('ham-change-settings-section', handleChangeSection as EventListener);
  }, []);

  return (
    <div className="flex h-full bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-2xl text-[var(--text-primary)] relative">
      {/* Engine v7 Status Indicator */}
      <div className="absolute bottom-6 right-8 z-50 flex items-center gap-2.5 pointer-events-none opacity-40 group hover:opacity-100 transition-opacity">
        <div className="flex flex-col items-end">
          <span className="text-[7px] font-black text-violet-400 uppercase tracking-[0.2em] leading-none mb-1">System Core</span>
          <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Quantum V7.2.0</span>
        </div>
        <div className="p-1.5 bg-violet-500/10 rounded-lg border border-violet-500/20">
          <Activity size={12} className="text-violet-400 animate-pulse" />
        </div>
      </div>
      
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-6 left-6 z-50 p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-violet-400 hover:bg-[var(--bg-tertiary)] transition-all shadow-lg hover:shadow-violet-500/10"
        >
          <Menu size={20} />
        </button>
      )}

      <SettingsSidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        t={t} 
      />

      <div 
        className="flex-1 overflow-y-auto p-10 relative bg-[var(--bg-primary)] scrollbar-thin scrollbar-thumb-[var(--border-color)]"
        onClick={() => {
          if (window.innerWidth < 768 && isSidebarOpen) setIsSidebarOpen(false);
        }}
      >
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="border-b border-[var(--border-color)] pb-6 mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-[var(--text-primary)] capitalize tracking-tight mb-1">{activeSection}</h1>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.3em] font-bold opacity-50">Configuration Interface</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/5 border border-violet-500/10 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Active Session</span>
            </div>
          </div>
          
          <div className="bg-[var(--bg-secondary)]/30 rounded-2xl border border-[var(--border-color)] p-8 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
            
            <Suspense fallback={<SectionLoader />}>
              {activeSection === 'general' && <GeneralSection settings={settings} handleSave={handleSave} toggleSetting={toggleSetting} language={language} setLanguage={setLanguage} t={t} />}
              {activeSection === 'api' && <ApiSection apiKeys={apiKeys} handleApiKeyChange={handleApiKeyChange} saveApiKeys={saveApiKeys} />}
              {activeSection === 'privacy' && <PrivacySection settings={settings} handleSave={handleSave} toggleSetting={toggleSetting} t={t} />}
              {activeSection === 'appearance' && <AppearanceSection settings={settings} handleSave={handleSave} toggleSetting={toggleSetting} t={t} theme={theme} setTheme={setTheme} />}
              {activeSection === 'performance' && <PerformanceSection settings={settings} handleSave={handleSave} toggleSetting={toggleSetting} t={t} />}
              {activeSection === 'content' && <ContentSection settings={settings} handleSave={handleSave} toggleSetting={toggleSetting} t={t} />}
              {activeSection === 'autofill' && <AutofillSection settings={settings} handleSave={handleSave} toggleSetting={toggleSetting} t={t} />}
              {activeSection === 'downloads' && <DownloadSection settings={settings} handleSave={handleSave} toggleSetting={toggleSetting} t={t} />}
              {activeSection === 'deploy' && <DeploySection />}
              {activeSection === 'about' && <AboutSection />}
              {activeSection === 'brain' && <BrainSection {...brain} />}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
