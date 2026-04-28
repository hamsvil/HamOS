 
import { useState, useEffect, useRef, useCallback } from 'react';
import { z } from 'zod';
// useSettings Hook
import { safeStorage } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const SettingsSchema = z.object({
  theme: z.string().default('Neon Cyberpunk'),
  searchEngine: z.string().default('Google (Ham Enhanced)'),
  defaultBrowser: z.boolean().default(false),
  encryption: z.boolean().default(true),
  antiTracking: z.boolean().default(true),
  gpuAcceleration: z.boolean().default(true),
  doNotTrack: z.boolean().default(false),
  cameraAccess: z.boolean().default(true),
  microphoneAccess: z.boolean().default(true),
  locationAccess: z.boolean().default(true),
  notifications: z.boolean().default(true),
  javascript: z.boolean().default(true),
  popups: z.boolean().default(false),
  developerMode: z.boolean().default(false),
  language: z.string().default('id'),
  fontSize: z.union([z.string(), z.number()]).default('small'),
  autofillPasswords: z.boolean().default(true),
  autofillAddresses: z.boolean().default(true),
  downloadPath: z.string().default('Ham Drive/Downloads'),
  askWhereToSave: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
  checkUpdates: z.boolean().default(true),
  aiRamLimit: z.number().default(2),
  layoutMode: z.string().default('desktop'),
});

type Settings = z.infer<typeof SettingsSchema>;

export const useSettings = () => {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [settings, setSettings] = useState<Settings>({
    theme: 'Neon Cyberpunk',
    searchEngine: 'Google (Ham Enhanced)',
    defaultBrowser: false,
    encryption: true,
    antiTracking: true,
    gpuAcceleration: true,
    doNotTrack: false,
    cameraAccess: true,
    microphoneAccess: true,
    locationAccess: true,
    notifications: true,
    javascript: true,
    popups: false,
    developerMode: false,
    language: 'id',
    fontSize: 'small',
    autofillPasswords: true,
    autofillAddresses: true,
    downloadPath: 'Ham Drive/Downloads',
    askWhereToSave: false,
    highContrast: false,
    reducedMotion: false,
    checkUpdates: true,
    aiRamLimit: 2,
    layoutMode: 'desktop',
  });

  const [apiKeys, setApiKeys] = useState({
    gemini: '',
    github: '',
    supabaseUrl: '',
    supabaseKey: ''
  });

  useEffect(() => {
    const saved = safeStorage.getItem('quantum_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validated = SettingsSchema.parse(parsed);
        setSettings(validated);
        
        if (validated.fontSize) {
          const html = document.documentElement;
          if (typeof validated.fontSize === 'number') {
            html.style.fontSize = `${validated.fontSize}px`;
          } else if (validated.fontSize === 'small') html.style.fontSize = '10px';
          else if (validated.fontSize === 'large') html.style.fontSize = '16px';
          else html.style.fontSize = ''; 
        }
      } catch (e) {
        console.error("Settings validation failed, using defaults", e);
      }
    }
    
    setApiKeys({
      gemini: safeStorage.getItem('ham_gemini_api_key') || '',
      github: safeStorage.getItem('ham_github_token') || '',
      supabaseUrl: safeStorage.getItem('ham_supabase_url') || '',
      supabaseKey: safeStorage.getItem('ham_supabase_key') || ''
    });

    const handleSync = () => {
      const updated = safeStorage.getItem('quantum_settings');
      if (updated) {
        try {
          const parsed = JSON.parse(updated);
          setSettings(SettingsSchema.parse(parsed));
        } catch (e) {
          console.error("Sync validation failed", e);
        }
      }
    };

    window.addEventListener('ham-settings-changed', handleSync);
    return () => {
      window.removeEventListener('ham-settings-changed', handleSync);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const persistSettings = useCallback((newSettings: Settings) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      safeStorage.setItem('quantum_settings', JSON.stringify(newSettings));
      window.dispatchEvent(new CustomEvent('ham-settings-changed'));
    }, 800); // 800ms debounce
  }, []);

  const handleSave = (newSettings: any) => {
    try {
      const validated = SettingsSchema.parse(newSettings);
      setSettings(validated);
      
      if (validated.fontSize) {
        const html = document.documentElement;
        if (typeof validated.fontSize === 'number') {
          html.style.fontSize = `${validated.fontSize}px`;
        } else if (validated.fontSize === 'small') html.style.fontSize = '10px';
        else if (validated.fontSize === 'large') html.style.fontSize = '16px';
        else html.style.fontSize = ''; 
      }

      persistSettings(validated);
    } catch (e) {
      console.error("Failed to save settings: invalid data", e);
      showToast("Gagal menyimpan pengaturan: Data tidak valid", "error");
    }
  };

  const toggleSetting = (key: string) => {
    const newSettings = { ...settings, [key]: !settings[key as keyof Settings] };
    handleSave(newSettings);
  };

  const handleApiKeyChange = (key: keyof typeof apiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
  };

  const saveApiKeys = () => {
    safeStorage.setItem('ham_gemini_api_key', apiKeys.gemini);
    safeStorage.setItem('ham_github_token', apiKeys.github);
    safeStorage.setItem('ham_supabase_url', apiKeys.supabaseUrl);
    safeStorage.setItem('ham_supabase_key', apiKeys.supabaseKey);
    
    showToast('API Keys berhasil disimpan dan disinkronisasi!', 'success');
  };

  return {
    settings,
    setSettings,
    apiKeys,
    setApiKeys,
    handleSave,
    toggleSetting,
    handleApiKeyChange,
    saveApiKeys,
    theme,
    setTheme,
    language,
    setLanguage,
    t
  };
};
