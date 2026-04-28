 
import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeStorage } from '../utils/storage';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      // Check quantum_settings first for theme preference
      const quantumSettings = safeStorage.getItem('quantum_settings');
      if (quantumSettings) {
        try {
          const parsed = JSON.parse(quantumSettings);
          // Map 'Neon Cyberpunk' etc to 'dark' or 'light' if needed, or just use the separate theme mode
          // But SettingsTab saves 'theme' as string name, and 'mode' isn't explicitly there?
          // Wait, SettingsTab has:
          // onClick={() => setTheme('light')}
          // So it uses ThemeContext directly for mode.
          // So we just need to ensure we persist 'ham_theme' which we do.
          // But let's also check if we should respect 'quantum_settings' if 'ham_theme' is missing.
        } catch (e) {}
      }
      return (safeStorage.getItem('ham_theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    let effectiveTheme = theme;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      effectiveTheme = systemTheme;
    }

    root.classList.add(effectiveTheme);
    safeStorage.setItem('ham_theme', theme);

    // Update Meta Theme Color for Android Status Bar
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    // Set color based on theme
    // Dark/Cyberpunk: #000000 or #0a0a0a
    // Light: #ffffff
    const color = effectiveTheme === 'dark' ? '#0a0a0a' : '#ffffff';
    metaThemeColor.setAttribute('content', color);

  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
