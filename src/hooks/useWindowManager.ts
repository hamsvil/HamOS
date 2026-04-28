 
import { useState, useCallback, useEffect } from 'react';
import { WindowState } from '../types/window';
import { safeStorage } from '../utils/storage';
import { 
  Globe, 
  Terminal, 
  Cpu, 
  Settings, 
  Brain, 
  Database 
} from 'lucide-react';

const INITIAL_WINDOWS: Record<string, Partial<WindowState>> = {
  'browser': { title: 'Web Browser', icon: Globe, size: { width: '80%', height: '70%' } },
  'terminal': { title: 'Terminal', icon: Terminal, size: { width: 600, height: 400 } },
  'ham-aistudio': { title: 'HAM AI Studio', icon: Cpu, size: { width: '90%', height: '85%' } },
  'memory': { title: 'Holographic Memory', icon: Database, size: { width: 500, height: 600 } },
  'ai': { title: 'AI Hub', icon: Brain, size: { width: 800, height: 600 } },
  'settings': { title: 'Settings', icon: Settings, size: { width: 450, height: 550 } },
};

const STORAGE_KEY = 'ham_window_manager_state';

export function useWindowManager(layoutMode: string = 'tablet') {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(100);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state on mount
  useEffect(() => {
    const savedState = safeStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (Array.isArray(parsed.windows)) {
          const restoredWindows = parsed.windows.map((w: any) => {
            const config = INITIAL_WINDOWS[w.id];
            return {
              ...w,
              title: config?.title || w.title || w.id,
              icon: config?.icon || Terminal,
            };
          });
          setWindows(restoredWindows);
          if (parsed.maxZIndex) setMaxZIndex(parsed.maxZIndex);
        }
      } catch (e) {
        console.error("Failed to load window manager state", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    
    // Omit icon from saved state
    const stateToSave = {
      maxZIndex,
      windows: windows.map(({ icon, ...rest }) => rest)
    };
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [windows, maxZIndex, isLoaded]);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      const newZ = maxZIndex + 1;
      setMaxZIndex(newZ);
      return prev.map(w => w.id === id ? { ...w, zIndex: newZ, isMinimized: false } : w);
    });
  }, [maxZIndex]);

  const openWindow = useCallback((id: string) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id);
      if (existing) {
        focusWindow(id);
        return prev;
      }

      const config = INITIAL_WINDOWS[id];
      if (!config) return prev;

      const newZ = maxZIndex + 1;
      setMaxZIndex(newZ);

      const newWindow: WindowState = {
        id,
        title: config.title || id,
        icon: config.icon || Terminal,
        isOpen: true,
        isMinimized: false,
        isMaximized: true,
        zIndex: newZ,
        position: layoutMode === 'desktop' 
          ? { x: 50 + (prev.length * 20), y: 50 + (prev.length * 20) } 
          : { x: 0, y: 0 },
        size: layoutMode === 'desktop'
          ? config.size || { width: 800, height: 600 }
          : { width: '100%', height: '100%' },
        component: id
      };

      return [...prev, newWindow];
    });
  }, [maxZIndex, focusWindow, layoutMode]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  }, []);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, position: { x, y } } : w));
  }, []);

  const updateSize = useCallback((id: string, width: number | string, height: number | string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, size: { width, height } } : w));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    setWindows(prev => prev.map((w, index) => {
      const config = INITIAL_WINDOWS[w.id];
      // Only reset position and size if we are switching to tablet mode
      // If we are in desktop mode, keep the existing position/size if available
      return {
        ...w,
        isMaximized: layoutMode === 'tablet' ? true : w.isMaximized,
        position: layoutMode === 'desktop' 
          ? (w.position?.x !== 0 || w.position?.y !== 0 ? w.position : { x: 50 + (index * 20), y: 50 + (index * 20) }) 
          : { x: 0, y: 0 },
        size: layoutMode === 'desktop'
          ? (w.size?.width !== '100%' ? w.size : (config?.size || { width: 800, height: 600 }))
          : { width: '100%', height: '100%' }
      };
    }));
  }, [layoutMode, isLoaded]);

  return {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    updatePosition,
    updateSize
  };
}
