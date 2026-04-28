 
import { useState, useCallback, useEffect } from 'react';
import { BrowserTab } from '../types';
import { structuredDb } from '../../../db/structuredDb';

export function useBrowserTabs(initialUrl: string = 'https://www.google.com/search?igu=1', incognitoMode: boolean = false) {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [previousActiveTabId, setPreviousActiveTabId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedTabs = await structuredDb.browserTabs.orderBy('lastAccessed').reverse().toArray();
        if (savedTabs && savedTabs.length > 0) {
          setTabs(savedTabs);
          setActiveTabId(savedTabs[0].id);
        } else {
          const newTab: BrowserTab = {
            id: `tab-${Date.now()}`,
            url: initialUrl,
            title: 'New Tab',
            isLoading: false,
            history: [initialUrl],
            historyIndex: 0,
            lastAccessed: Date.now(),
            isPinned: false,
            groupId: null,
            reloadKey: 0,
            zoomLevel: 1,
            isReaderMode: false
          };
          setTabs([newTab]);
          setActiveTabId(newTab.id);
        }
      } catch (error) {
        console.error('Failed to load browser session:', error);
        const newTab: BrowserTab = {
          id: `tab-${Date.now()}`,
          url: initialUrl,
          title: 'New Tab',
          isLoading: false,
          history: [initialUrl],
          historyIndex: 0,
          lastAccessed: Date.now(),
          isPinned: false,
          groupId: null,
          reloadKey: 0,
          zoomLevel: 1,
          isReaderMode: false
        };
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      } finally {
        setIsInitialized(true);
      }
    };
    loadSession();
  }, [initialUrl]);

  useEffect(() => {
    if (!isInitialized || incognitoMode) return;
    
    const saveSession = async () => {
      // PROTOKOL: Anti-Data Loss
      // Never save empty tabs if we were previously initialized with data
      if (!isInitialized || tabs.length === 0 || incognitoMode) return;

      try {
        await structuredDb.browserTabs.clear();
        await structuredDb.browserTabs.bulkAdd(tabs);
      } catch (error) {
        console.error('Failed to save browser session:', error);
      }
    };
    
    // Debounce the save to prevent excessive DB writes
    const timeoutId = setTimeout(saveSession, 1000);
    return () => clearTimeout(timeoutId);
  }, [tabs, isInitialized, incognitoMode]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || null;

  const handleSetActiveTabId = useCallback((id: string) => {
    setPreviousActiveTabId(activeTabId);
    setActiveTabId(id);
  }, [activeTabId]);

  const addTab = useCallback((url: string = 'https://www.google.com/search?igu=1', groupId: string | null = null) => {
    const newTab: BrowserTab = {
      id: `tab-${Date.now()}`,
      url,
      title: 'New Tab',
      isLoading: true,
      history: [url],
      historyIndex: 0,
      lastAccessed: Date.now(),
      isPinned: false,
      groupId,
      reloadKey: 0,
      zoomLevel: 1,
      isReaderMode: false
    };
    setTabs(prev => [...prev, newTab]);
    handleSetActiveTabId(newTab.id);
  }, [handleSetActiveTabId]);

  const togglePin = useCallback((id: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
  }, []);

  const setGroup = useCallback((id: string, groupId: string | null) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, groupId } : t));
  }, []);

  const closeTab = useCallback((id: string) => {
    let newTabs = tabs.filter(t => t.id !== id);
    let newActiveId = activeTabId;

    if (newTabs.length === 0) {
      const newTab: BrowserTab = {
        id: `tab-${Date.now()}`,
        url: 'https://www.google.com/search?igu=1',
        title: 'New Tab',
        isLoading: false,
        history: ['https://www.google.com/search?igu=1'],
        historyIndex: 0,
        lastAccessed: Date.now(),
        isPinned: false,
        groupId: null,
        reloadKey: 0,
        zoomLevel: 1,
        isReaderMode: false
      };
      newTabs = [newTab];
      newActiveId = newTab.id;
    } else if (id === activeTabId) {
      // Try to go back to previous active tab if it still exists
      if (previousActiveTabId && newTabs.some(t => t.id === previousActiveTabId)) {
        newActiveId = previousActiveTabId;
      } else {
        // Otherwise fallback to the tab to the left (or right if it was the first)
        const closedIndex = tabs.findIndex(t => t.id === id);
        newActiveId = newTabs[Math.max(0, closedIndex - 1)].id;
      }
    }

    setTabs(newTabs);
    if (newActiveId !== activeTabId) {
      handleSetActiveTabId(newActiveId);
    }
  }, [tabs, activeTabId, previousActiveTabId, handleSetActiveTabId]);

  const updateTab = useCallback((id: string, updates: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const navigateTab = useCallback((id: string, url: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id === id) {
        let historyArray = Array.isArray(t.history) ? t.history : [];
        let newHistory = historyArray.slice(0, t.historyIndex + 1);
        newHistory.push(url);
        
        // PROTOKOL: Anti-Memory Bloat (Limit history to 50)
        if (newHistory.length > 50) {
          newHistory = newHistory.slice(newHistory.length - 50);
        }

        return {
          ...t,
          url,
          isLoading: true,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          title: 'Loading...'
        };
      }
      return t;
    }));
  }, []);

  const goBack = useCallback((id: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id === id && t.historyIndex > 0) {
        const newIndex = t.historyIndex - 1;
        return {
          ...t,
          url: t.history[newIndex],
          historyIndex: newIndex,
          isLoading: true
        };
      }
      return t;
    }));
  }, []);

  const goForward = useCallback((id: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id === id && t.historyIndex < t.history.length - 1) {
        const newIndex = t.historyIndex + 1;
        return {
          ...t,
          url: t.history[newIndex],
          historyIndex: newIndex,
          isLoading: true
        };
      }
      return t;
    }));
  }, []);

  const reorderTabs = useCallback((newTabs: BrowserTab[]) => {
    setTabs(newTabs);
  }, []);

  const reloadTab = useCallback((id: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          isLoading: true,
          reloadKey: (t.reloadKey || 0) + 1
        };
      }
      return t;
    }));
  }, []);

  return {
    tabs,
    activeTabId,
    setActiveTabId: handleSetActiveTabId,
    addTab,
    closeTab,
    updateTab,
    navigateTab,
    goBack,
    goForward,
    activeTab,
    togglePin,
    setGroup,
    reorderTabs,
    reloadTab
  };
}
