// [ARCHITECTURE] Refactored to sub-components in src/App/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HamBackground from './components/HamBackground';
import SplashScreen from './components/SplashScreen';
import CommandPalette from './components/CommandPalette';
import { ErrorBoundary } from './components/ErrorBoundary';
import TrialGuard from './components/TrialGuard';
import { safeStorage } from './utils/storage';
import SystemInfoModal from './components/SystemInfoModal';
import BottomDock from './components/BottomDock';
import AppDrawer from './components/AppDrawer';
import { useToast } from './context/ToastContext';
import { useConfirm } from './context/ConfirmContext';
import { PromptProvider } from './context/PromptContext';
import { TopBar } from './components/TopBar';
import StatePersistIndicator from './components/HamAiStudio/Device/StatePersistIndicator';
import LiveUpdateIndicator from './components/ui/LiveUpdateIndicator';
import { SafeModeOverlay } from './components/HamAiStudio/SafeModeOverlay';
import { useInitializeApp } from './hooks/useInitializeApp';
import { HASChatWindow } from './HAS/ui/HASChatWindow';
import { SwarmDISPanel } from './components/SwarmDISPanel';

// Sub-components and hooks
import { TabRenderer } from './App/TabRenderer';
import { useGlobalErrors } from './App/useGlobalErrors';

import { StatusBar } from '@capacitor/status-bar';
import { EnvironmentChecker } from './services/environmentChecker';

export default function App() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  useGlobalErrors();

  const {
    loading,
    setLoading,
    progress,
    loadingStatus,
    showForceStart,
    isInitialized,
    setIsInitialized,
    layoutMode,
    isDark,
    isOnline,
    batteryLevel,
    isCharging,
    activeTab,
    setActiveTab
  } = useInitializeApp();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDockMinimized, setIsDockMinimized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleForceStart = () => {
    setLoading(false);
    setIsInitialized(true);
  };

  useEffect(() => {
    const applyPerformanceMode = () => {
      const isPerformanceMode = safeStorage.getItem('ham_performance_mode') === 'true';
      if (isPerformanceMode) document.body.classList.add('performance-mode');
      else document.body.classList.remove('performance-mode');
    };
    applyPerformanceMode();
    window.addEventListener('ham-settings-changed', applyPerformanceMode);
    return () => window.removeEventListener('ham-settings-changed', applyPerformanceMode);
  }, []);

  useEffect(() => {
    const handlePause = () => { window.dispatchEvent(new CustomEvent('ham-global-save')); };
    const handleVfsError = (e: any) => { showToast(`VFS Error: ${e.detail?.message || 'Unknown error'}`, 'error'); };
    
    document.addEventListener('pause', handlePause, false);
    window.addEventListener('ham-vfs-error', handleVfsError as EventListener);
    
    const handleChangeTab = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: string }>;
      if (customEvent.detail?.tab) setActiveTab(customEvent.detail.tab);
    };
    window.addEventListener('ham-change-tab', handleChangeTab as EventListener);
    
    return () => { 
      document.removeEventListener('pause', handlePause, false); 
      window.removeEventListener('ham-vfs-error', handleVfsError as EventListener);
      window.removeEventListener('ham-change-tab', handleChangeTab as EventListener);
    };
  }, [setActiveTab, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCommandPaletteOpen(true); }
      if (e.altKey && !isInput) {
        const key = e.key.toLowerCase();
        const tabs: Record<string, string> = {
          'b': 'browser', 's': 'ham-aistudio', 'm': 'memory', 't': 'terminal',
          'a': 'ai', 'n': 'tasks', 'v': 'synapse-vision', 'o': 'omni', ',': 'settings'
        };
        if (tabs[key]) setActiveTab(tabs[key]);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); window.dispatchEvent(new CustomEvent('ham-global-save')); }
      if ((e.metaKey || e.ctrlKey) && e.key === '`') { e.preventDefault(); setActiveTab(prev => prev === 'terminal' ? 'ham-aistudio' : 'terminal'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  const toggleFullscreen = async () => {
    const isNative = EnvironmentChecker.isNativeAndroid();
    try {
      if (isNative) {
        if (!isFullscreen) {
          await StatusBar.hide();
          setIsFullscreen(true);
        } else {
          await StatusBar.show();
          setIsFullscreen(false);
        }
      } else {
        if (!document.fullscreenElement) {
          if (document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); setIsFullscreen(true); }
        } else {
          if (document.exitFullscreen) { await document.exitFullscreen(); setIsFullscreen(false); }
        }
      }
    } catch (err) { console.warn('[App] Fullscreen toggle failed:', err); }
  };

  if (loading) {
    return (
      <SplashScreen 
        progress={progress} 
        status={loadingStatus} 
        onForceStart={showForceStart ? handleForceStart : undefined}
      />
    );
  }

  return (
    <ErrorBoundary>
      <TrialGuard>
        <PromptProvider>
          <div className={`relative w-full h-[100dvh] overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col transition-all duration-500 ${
            layoutMode === 'mobile' ? 'layout-mobile' : layoutMode === 'tablet' ? 'layout-tablet' : 'layout-desktop'
          }`}>
          <ErrorBoundary>
            <HamBackground />
          </ErrorBoundary>
          
          <div className={`fixed inset-0 pointer-events-none z-[9999] mix-blend-overlay transition-opacity duration-500 ${isDark ? 'opacity-[0.02]' : 'opacity-[0.01]'}`}>
            <div className={`absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)]' : 'bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.1)_100%)]'}`} />
            <div className={`absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%]`} />
          </div>

          <TopBar 
            isOnline={isOnline}
            batteryLevel={batteryLevel}
            isCharging={isCharging}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            setIsCommandPaletteOpen={setIsCommandPaletteOpen}
            setShowSystemInfo={setShowSystemInfo}
            confirm={confirm}
            toggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
          />

          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 p-2 md:p-3" style={{ bottom: isDockMinimized ? '0px' : '72px' }}>
              <div className="w-full h-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)]/20 backdrop-blur-sm shadow-2xl relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="w-full h-full"
                    >
                      <TabRenderer activeTab={activeTab} />
                    </motion.div>
                  </AnimatePresence>
              </div>
            </div>
          </div>

          <CommandPalette 
            isOpen={isCommandPaletteOpen} 
            onClose={() => setIsCommandPaletteOpen(false)} 
            onSelectTab={setActiveTab} 
            onSelectFile={(path) => {
              setActiveTab('ham-aistudio');
              setTimeout(() => { window.dispatchEvent(new CustomEvent('ham-open-file', { detail: { path } })); }, 100);
            }}
          />

          {showSystemInfo && (
            <SystemInfoModal 
              onClose={() => setShowSystemInfo(false)} 
              systemStats={{ cpu: 0, ram: 0, disk: 0 }} 
              batteryLevel={batteryLevel} 
              isCharging={isCharging} 
              isOnline={isOnline} 
            />
          )}

          <AppDrawer 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />

          <BottomDock 
            isDockMinimized={isDockMinimized} 
            setIsDockMinimized={setIsDockMinimized} 
          />

          <HASChatWindow />
          <SwarmDISPanel autoActivate={true} />
          <SafeModeOverlay />
          <StatePersistIndicator />
          <LiveUpdateIndicator />
        </div>
      </PromptProvider>
    </TrialGuard>
  </ErrorBoundary>
);
}
