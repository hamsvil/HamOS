 
import { useState, useEffect, useMemo, useRef } from 'react';
import { safeStorage } from '../utils/storage';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../context/ThemeContext';

export function useAppInitialization() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Initializing HAM OS...');
  const [showForceStart, setShowForceStart] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const isNativeRef = useRef(false);

  const { settings } = useSettings();
  const { theme } = useTheme();
  const layoutMode = settings.layoutMode || 'tablet';

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch (e) {
        return true;
      }
    }
    return true;
  }, [theme]);

  useEffect(() => {
    safeStorage.setItem('ham_reload_count', '0');
    safeStorage.setItem('ham_last_reload_time', '0');
  }, []);

  return {
    loading,
    setLoading,
    progress,
    setProgress,
    loadingStatus,
    setLoadingStatus,
    showForceStart,
    setShowForceStart,
    isInitialized,
    setIsInitialized,
    isNativeRef,
    layoutMode,
    isDark
  };
}
