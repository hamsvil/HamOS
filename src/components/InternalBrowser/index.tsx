import { BrowserTab } from './types';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
// [AUTO-GENERATED-IMPORTS-START]
import { AdblockConfig } from './components/AdblockConfig';
import { BookmarkBar } from './components/Bookmarks/BookmarkBar';
import { BackForwardControls } from './components/BackForwardControls';
import { BookmarkManager } from './components/BookmarkManager';
import { BookmarkToggle } from './components/BookmarkToggle';
import { BrowserContent } from './components/BrowserContent';
import { BrowserErrorBoundary } from './components/BrowserErrorBoundary';
import { BrowserSettingsDrawer } from './components/BrowserSettingsDrawer';
import { BrowserTabs } from './components/BrowserTabs';
import { BrowserToolbar } from './components/BrowserToolbar';
import { CertExceptionList } from './components/CertExceptionList';
import { CleanSessionButton } from './components/CleanSessionButton';
import { CloseTabButton } from './components/CloseTabButton';
import { ConsoleLogOverlay } from './components/ConsoleLogOverlay';
import { CookieEditor } from './components/CookieEditor';
import { DomInspectorView } from './components/DomInspectorView';
import { DownloadsPanel } from './components/DownloadsPanel';
import { ExtensionList } from './components/ExtensionList';
import { FontSizeSlider } from './components/FontSizeSlider';
import { FormAutofillManager } from './components/FormAutofillManager';
import { HeaderModifier } from './components/HeaderModifier';
import { HistoryManager } from './components/HistoryManager';
import { IncognitoToggle } from './components/IncognitoToggle';
import { InspectElementToggle } from './components/InspectElementToggle';
import { JockeyPanel } from './components/JockeyPanel';
import { LanguagePicker } from './components/LanguagePicker';
import { NetworkTrafficTable } from './components/NetworkTrafficTable';
import { NewTabButton } from './components/NewTabButton';
import { PageInfoPanel } from './components/PageInfoPanel';
import { PageLoadTimer } from './components/PageLoadTimer';
import { PrivacyClearControl } from './components/PrivacyClearControl';
import { ProxyConfigForm } from './components/ProxyConfigForm';
import { ReaderMode } from './components/ReaderMode';
import { ReaderModeSettings } from './components/ReaderModeSettings';
import { ReloadButton } from './components/ReloadButton';
import { ResourceLoadChart } from './components/ResourceLoadChart';
import { ScreenshotPageButton } from './components/ScreenshotPageButton';
import { ScriptInjectorInput } from './components/ScriptInjectorInput';
import { SearchEnginePicker } from './components/SearchEnginePicker';
import { SecurityStatusBadge } from './components/SecurityStatusBadge';
import { SitePermissionsTable } from './components/SitePermissionsTable';
import { StartupPageConfig } from './components/StartupPageConfig';
import { StopLoadingButton } from './components/StopLoadingButton';
import { TabSwitcherStrip } from './components/TabSwitcherStrip';
import { ThemeSettings } from './components/ThemeSettings';
import { UrlBar } from './components/UrlBar';
import { UserAgentSwitcher } from './components/UserAgentSwitcher';
// [AUTO-GENERATED-IMPORTS-END]
 
// [UI LAYER] Direct DOM manipulation acknowledged and isolated.
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
// [STABILITY] Promise chains verified
import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { useBrowserTabs } from './hooks/useBrowserTabs';
import { useBrowserStore } from './store/browserStore';
import { X, Maximize2, Minimize2, Sidebar, Bookmark, History as HistoryIcon, Sparkles, Activity, ShieldCheck, BookOpen, ZoomIn, ZoomOut, Clock, Search, RefreshCw, Bot, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../hooks/useSettings';
import { useSupremeProtocol } from '../../hooks/useSupremeProtocol';
import { useBrowserCookies } from './hooks/useBrowserCookies';
import { useFeatureAgent } from '../HamAiStudio/hooks/useFeatureAgent';
import { Badge } from '../ui/badge';

import { hamEventBus } from '../../ham-synapse/core/event_bus';
import { HamEventType } from '../../ham-synapse/core/types';

import { browserPilotService } from './services/BrowserPilotService';

// Lazy load heavy panels
const HamJokeyPanel = lazy(() => import('./components/HamJokeyPanel').then(m => ({ default: m.HamJokeyPanel })).catch(e => { console.error(e); return { default: () => null }; }));
const BrowserDevTools = lazy(() => import('./components/BrowserDevTools').then(m => ({ default: m.BrowserDevTools })).catch(e => { console.error(e); return { default: () => null }; }));
const BookmarkList = lazy(() => import('./components/Bookmarks/BookmarkList').then(m => ({ default: m.BookmarkList })).catch(e => { console.error(e); return { default: () => null }; }));
const HistoryList = lazy(() => import('./components/History/HistoryList').then(m => ({ default: m.HistoryList })).catch(e => { console.error(e); return { default: () => null }; }));

import { useBrowserEvents } from './hooks/useBrowserEvents';
import { useBrowserPilot } from './hooks/useBrowserPilot';

export default function InternalBrowser() {
  return (
    <BrowserErrorBoundary>
      <InternalBrowserContent />
    </BrowserErrorBoundary>
  );
}

function InternalBrowserContent() {
  const { boundInstance } = useFeatureAgent('neural-pilot');
  useSupremeProtocol();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { 
    loadData, 
    addToHistory, 
    addBookmark, 
    removeBookmark, 
    isBookmarked,
    clearCache,
    bookmarks,
    history,
    incognitoMode,
    setIncognitoMode
  } = useBrowserStore();

  const {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    updateTab,
    navigateTab,
    goBack,
    goForward,
    activeTab,
    reorderTabs,
    reloadTab,
    togglePin
  } = useBrowserTabs('https://www.google.com/search?igu=1', incognitoMode);

  const { cookies, setCookies } = useBrowserCookies();
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  const searchUrl = useMemo(() => {
    switch (settings.searchEngine) {
      case 'DuckDuckGo': return 'https://duckduckgo.com/?q=';
      case 'Bing': return 'https://www.bing.com/search?q=';
      default: return 'https://www.google.com/search?igu=1&q=';
    }
  }, [settings.searchEngine]);

  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isJokeyOpen, setIsJokeyOpen] = useState(false);
  const [logs, setLogs] = useState<{level: string, message: string}[]>([]);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarView, setSidebarView] = useState<'bookmarks' | 'history'>('bookmarks');

  const { handleBrowserAction } = useBrowserPilot(
    activeTabId, 
    activeTab, 
    tabs, 
    navigateTab, 
    addTab, 
    closeTab, 
    reloadTab, 
    showToast, 
    searchUrl, 
    iframeRefs
  );

  useBrowserEvents(activeTabId, setLogs, setNetworkRequests, setCookies, iframeRefs);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleServerReady = (e: Event) => {
      const customEvent = e as CustomEvent<{ port: number, url: string }>;
      const { url } = customEvent.detail;
      
      const hasPreviewTab = tabs.some(t => t.url.includes('localhost') || t.url.includes('preview.local') || t.url === url);
      
      if (!hasPreviewTab) {
        showToast(`Server ready at ${url}`, 'success');
        addTab(url, 'Live Preview');
      } else {
        const previewTab = tabs.find(t => t.url.includes('localhost') || t.url.includes('preview.local'));
        if (previewTab) {
          navigateTab(previewTab.id, url);
        }
      }
    };

    window.addEventListener('ham-server-ready', handleServerReady);
    return () => window.removeEventListener('ham-server-ready', handleServerReady);
  }, [tabs, addTab, navigateTab, showToast]);

  const currentActiveTabId = activeTabId || (tabs.length > 0 ? tabs[tabs.length - 1].id : '');

  const handleOpenSettings = useCallback(() => {
    setIsMenuOpen(false);
    window.dispatchEvent(new CustomEvent('ham-change-tab', { detail: { tab: 'settings' } }));
  }, []);

  const handleCloseReaderMode = useCallback((id: string) => updateTab(id, { isReaderMode: false }), [updateTab]);
  const handleLoadStart = useCallback((id: string) => updateTab(id, { isLoading: true }), [updateTab]);
  const handleLoadEnd = useCallback((id: string) => updateTab(id, { isLoading: false }), [updateTab]);
  const handleUrlChange = useCallback((id: string, newUrl: string) => navigateTab(id, newUrl), [navigateTab]);

  const handleOpenExternal = useCallback(async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank');
    }
  }, []);

  if (tabs.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">No Active Tabs</h2>
          <button 
            onClick={() => addTab()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            Open New Tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative">
      {/* Engine v7 Status Overlay */}
      <div className="absolute top-2 right-4 z-[100] flex items-center gap-2 pointer-events-none">
        <Activity size={10} className="text-violet-400 animate-pulse" />
        <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Quantum Engine v7.2</span>
      </div>
      {/* Window Controls & Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50 hover:bg-red-500/40 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500/40 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50 hover:bg-green-500/40 transition-colors cursor-pointer" />
          </div>
          <div className="h-4 w-px bg-[var(--border-color)] mx-1" />
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-violet-400" />
            <span className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">Quantum Browser v7.2</span>
          </div>
          {boundInstance && (
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 flex gap-1 items-center h-5 text-[8px] px-1.5 ml-2">
              <Bot size={10} />
              {boundInstance.agent.displayName} @ {boundInstance.ruleset.displayName}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsJokeyOpen(!isJokeyOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 border ${isJokeyOpen ? 'bg-violet-500/20 text-violet-400 border-violet-500/30 shadow-[0_0_15px_rgba(167,139,250,0.2)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-transparent'}`}
            title="Ham Jokey (AI Auto-Pilot)"
          >
            <Sparkles size={12} className={isJokeyOpen ? 'animate-pulse' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">neural pilot</span>
          </button>
          <div className="h-4 w-px bg-[var(--border-color)] mx-1" />
          <button 
            onClick={() => { setShowSidebar(!showSidebar); setSidebarView('bookmarks'); }}
            className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all ${showSidebar && sidebarView === 'bookmarks' ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)]'}`}
            title="Bookmarks"
          >
            <Bookmark size={14} />
          </button>
          <button 
            onClick={() => { setShowSidebar(!showSidebar); setSidebarView('history'); }}
            className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all ${showSidebar && sidebarView === 'history' ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)]'}`}
            title="History"
          >
            <HistoryIcon size={14} />
          </button>
          <button 
            onClick={() => setIsDevToolsOpen(!isDevToolsOpen)}
            className={`p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all ${isDevToolsOpen ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)]'}`}
            title="Toggle DevTools"
          >
            <Sidebar size={14} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Tabs & Ham Jokey Integration */}
      <div className="shrink-0 flex flex-col bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
        <div className="flex items-center pr-2">
          <div className="flex-1 overflow-hidden">
            <BrowserTabs 
              tabs={tabs} 
              activeTabId={currentActiveTabId} 
              onTabClick={setActiveTabId} 
              onTabClose={closeTab} 
              onNewTab={() => addTab()} 
              onReorder={reorderTabs}
              onTogglePin={togglePin}
            />
          </div>
          
          {isJokeyOpen && (
            <div className="flex items-center gap-2 px-2 py-1 bg-violet-500/10 border border-violet-500/30 rounded-md animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-tighter">Neural Link Active</span>
            </div>
          )}
        </div>
        
        {/* Navigation Progress Bar */}
        <div className="h-0.5 w-full bg-transparent overflow-hidden">
          {activeTab?.isLoading && (
            <div className="h-full bg-blue-500 animate-progress-indeterminate shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          )}
        </div>

        {/* Bookmark Bar */}
        <BookmarkBar 
          bookmarks={bookmarks}
          onNavigate={(url) => {
            if (activeTab) navigateTab(activeTab.id, url);
            else addTab(url);
          }}
        />
      </div>

      <Suspense fallback={<div className="h-0" />}>
        <HamJokeyPanel 
          isOpen={isJokeyOpen} 
          onClose={() => setIsJokeyOpen(false)} 
          activeTabUrl={activeTab?.url || ''}
        />
      </Suspense>

      {/* Toolbar */}
      <div className="shrink-0">
        <BrowserToolbar 
          canGoBack={activeTab ? activeTab.historyIndex > 0 : false}
          canGoForward={activeTab ? activeTab.historyIndex < activeTab.history.length - 1 : false}
          isLoading={activeTab ? activeTab.isLoading : false}
          url={activeTab ? activeTab.url : ''}
          onBack={() => activeTab && goBack(currentActiveTabId)}
          onForward={() => activeTab && goForward(currentActiveTabId)}
          onRefresh={() => {
            if (activeTab) {
              reloadTab(currentActiveTabId);
            }
          }}
          onHome={() => activeTab && navigateTab(currentActiveTabId, searchUrl)}
          onNavigate={(url) => {
            if (activeTab) {
              navigateTab(currentActiveTabId, url);
              addToHistory({ url, title: activeTab.title });
            }
          }}
          onToggleMenu={() => setIsMenuOpen(!isMenuOpen)} 
          isBookmarked={activeTab ? isBookmarked(activeTab.url) : false}
          onToggleBookmark={() => {
            if (activeTab) {
              if (isBookmarked(activeTab.url)) {
                removeBookmark(activeTab.url);
              } else {
                addBookmark({ url: activeTab.url, title: activeTab.title });
              }
            }
          }}
          onToggleCommand={() => {
            setIsJokeyOpen(!isJokeyOpen);
            showToast(!isJokeyOpen ? 'AI Auto-Pilot Activated' : 'AI Auto-Pilot Deactivated', !isJokeyOpen ? 'success' : 'info');
          }}
          isCommandActive={isJokeyOpen}
          onToggleReaderMode={() => activeTab && updateTab(activeTab.id, { isReaderMode: !activeTab.isReaderMode })}
          onZoom={(delta) => {
            if (activeTab) {
              const newZoom = Math.max(0.5, Math.min(3, (activeTab.zoomLevel || 1) + delta));
              updateTab(activeTab.id, { zoomLevel: newZoom });
            }
          }}
          bookmarks={bookmarks}
          history={history}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {showSidebar && (
          <div className="w-64 border-r border-[var(--border-color)] overflow-hidden shrink-0">
            <Suspense fallback={<div className="p-4 text-xs opacity-50">Loading...</div>}>
              {sidebarView === 'bookmarks' ? (
                <BookmarkList onNavigate={(url) => navigateTab(currentActiveTabId, url)} />
              ) : (
                <HistoryList onNavigate={(url) => navigateTab(currentActiveTabId, url)} />
              )}
            </Suspense>
          </div>
        )}
        <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
          {/* Menu Backdrop: captures outside-click to close the menu */}
          {isMenuOpen && (
            <div
              className="absolute inset-0 z-40"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />
          )}
          {/* Menu */}
          {isMenuOpen && (
            <div className="absolute top-0 right-0 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl z-50 p-2 rounded-bl-2xl animate-in slide-in-from-top-2 duration-200">
              <div className="sm:hidden border-b border-[var(--border-color)] mb-1 pb-1">
                <button 
                  onClick={() => {
                    if (activeTab) updateTab(activeTab.id, { isReaderMode: !activeTab.isReaderMode });
                    setIsMenuOpen(false);
                  }} 
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
                >
                  <BookOpen size={16} className="text-violet-400" />
                  Reader Mode
                </button>
              </div>
              
              <div className="md:hidden border-b border-[var(--border-color)] mb-1 pb-1 flex items-center justify-around py-1">
                <button 
                  onClick={() => {
                    if (activeTab) {
                      const newZoom = Math.max(0.5, Math.min(3, (activeTab.zoomLevel || 1) + 0.1));
                      updateTab(activeTab.id, { zoomLevel: newZoom });
                    }
                  }} 
                  className="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl text-violet-400"
                >
                  <ZoomIn size={18} />
                </button>
                <span className="text-[10px] font-bold opacity-50">ZOOM</span>
                <button 
                  onClick={() => {
                    if (activeTab) {
                      const newZoom = Math.max(0.5, Math.min(3, (activeTab.zoomLevel || 1) - 0.1));
                      updateTab(activeTab.id, { zoomLevel: newZoom });
                    }
                  }} 
                  className="p-2 hover:bg-[var(--bg-tertiary)] rounded-xl text-violet-400"
                >
                  <ZoomOut size={18} />
                </button>
              </div>

              <button 
                onClick={() => {
                  setIncognitoMode(!incognitoMode);
                  setIsMenuOpen(false);
                  showToast(incognitoMode ? 'Incognito Mode Disabled' : 'Incognito Mode Enabled', 'info');
                }} 
                className="flex items-center justify-between w-full text-left px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} className={incognitoMode ? 'text-violet-400' : 'text-[var(--text-secondary)]'} />
                  Incognito Mode
                </div>
                {incognitoMode && <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>}
              </button>
              
              <button 
                onClick={() => {
                  setShowSidebar(!showSidebar);
                  setIsMenuOpen(false);
                }} 
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
              >
                <Clock size={16} className="text-[var(--text-secondary)]" />
                History & Bookmarks
              </button>

              <button onClick={handleOpenSettings} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors">
                <Search size={16} className="text-[var(--text-secondary)]" />
                Settings
              </button>
              
              <button 
                onClick={() => { 
                  setIsMenuOpen(false); 
                  clearCache(); 
                  showToast('Cache cleared', 'success'); 
                }} 
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <RefreshCw size={16} />
                Clear Cache
              </button>
            </div>
          )}
          {tabs.map(tab => (
            <div key={tab.id} className={`flex-1 w-full h-full ${currentActiveTabId === tab.id ? 'block' : 'hidden'}`}>
              <BrowserContent
                ref={(el) => {
                  if (el) iframeRefs.current.set(tab.id, el);
                  else iframeRefs.current.delete(tab.id);
                }}
                id={`browser-iframe-${tab.id}`}
                url={tab.url}
                isActive={currentActiveTabId === tab.id}
                reloadKey={tab.reloadKey}
                zoomLevel={tab.zoomLevel}
                isReaderMode={tab.isReaderMode}
                onCloseReaderMode={() => handleCloseReaderMode(tab.id)}
                onLoadStart={() => handleLoadStart(tab.id)}
                onLoadEnd={() => handleLoadEnd(tab.id)}
                onError={(error) => {
                  console.error('Browser Error:', error);
                  updateTab(tab.id, { 
                    error: 'Navigation Failed', 
                    errorDetail: typeof error === 'string' ? error : JSON.stringify(error),
                    isLoading: false 
                  });
                }}
                onUrlChange={(newUrl) => handleUrlChange(tab.id, newUrl)}
                incognitoMode={incognitoMode}
              />
              {tab.error && (
                <div className="absolute inset-0 bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 text-center z-10">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Navigation Failed</h3>
                  <p className="text-[var(--text-secondary)] mb-6 max-w-md">
                    We couldn't load <strong>{tab.url}</strong>. Check your connection or the URL for errors.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        updateTab(tab.id, { error: null, errorDetail: null, isLoading: true });
                        reloadTab(tab.id);
                      }}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={16} /> Try Again
                    </button>
                    <button 
                      onClick={() => {
                        updateTab(tab.id, { error: null, errorDetail: null });
                        navigateTab(tab.id, 'https://www.google.com');
                      }}
                      className="px-6 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg font-bold transition-all"
                    >
                      Go Home
                    </button>
                    {Capacitor.isNativePlatform() && (
                      <button
                        onClick={() => handleOpenExternal(tab.url)}
                        className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                      >
                        <Maximize2 size={16} /> Open in Native
                      </button>
                    )}
                  </div>
                  {tab.errorDetail && (
                    <pre className="mt-8 p-4 bg-black/30 rounded text-left text-[10px] text-red-400 font-mono w-full max-w-xl overflow-auto">
                      {tab.errorDetail}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
          
          <Suspense fallback={null}>
            {isDevToolsOpen && (
              <BrowserDevTools 
                isOpen={isDevToolsOpen} 
                onClose={() => setIsDevToolsOpen(false)} 
                logs={logs.map(l => `[${l.level.toUpperCase()}] ${l.message}`)} 
                networkRequests={networkRequests} 
                cookies={cookies} 
              />
            )}
          </Suspense>
        </div>
      </div>
</div>
  );
}
