 
/* eslint-disable no-control-regex */
// [STABILITY] Promise chains verified
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useToast } from '../../../../context/ToastContext';
import { useConfirm } from '../../../../context/ConfirmContext';
import { safeStorage } from '../../../../utils/storage';
import { geminiKeyManager } from '../../../../services/geminiKeyManager';
import { githubService, GitHubUser } from '../../../../services/githubService';
import { GoogleGenAI } from "@google/genai";
import { nativeBridge } from '../../../../utils/nativeBridge';
import { neuralRouter, AIProvider } from '../../../../services/NeuralRouter';
import { AiWorkerService } from '../../../../services/aiWorkerService';

export function useSettingsLogic(isOpen: boolean, onClose: () => void, onProjectTypeChange: (type: string) => void) {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { confirm } = useConfirm();

  const [projectType, setProjectType] = useState('apk');
  const [aiModel, setAiModel] = useState('ham-engine-collaborator');
  const [kaggleEndpoint, setKaggleEndpoint] = useState('');
  const [kaggleApiKey, setKaggleApiKey] = useState('');
  const [kaggleUsername, setKaggleUsername] = useState('');
  const [kaggleKernelSlug, setKaggleKernelSlug] = useState('');
  const [alternateApiKey, setAlternateApiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [isSyncingKey, setIsSyncingKey] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [isSyncingGroq, setIsSyncingGroq] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  
  // GitHub States
  const [githubToken, setGithubToken] = useState('');
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [isVerifyingGithub, setIsVerifyingGithub] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [showMinimap, setShowMinimap] = useState(false);
  const [aiRamLimit, setAiRamLimit] = useState(2);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProjectType(safeStorage.getItem('ham_project_type') || 'apk');
      setAiModel(safeStorage.getItem('ham_ai_model') || 'ham-engine-collaborator');
      setKaggleEndpoint(safeStorage.getItem('kaggle_llm_endpoint') || '');
      setKaggleApiKey(safeStorage.getItem('kaggle_llm_api_key') || '');
      setKaggleUsername(safeStorage.getItem('kaggle_username') || '');
      setKaggleKernelSlug(safeStorage.getItem('kaggle_kernel_slug') || '');
      setTheme(safeStorage.getItem('ham_theme') as any || 'system');
      setAlternateApiKey(safeStorage.getItem('ham_alternate_api_key') || '');
      setSupabaseUrl(safeStorage.getItem('ham_supabase_url') || '');
      setSupabaseAnonKey(safeStorage.getItem('ham_supabase_anon_key') || '');
      setGroqApiKey(safeStorage.getItem('ham_groq_api_key') || '');
      setFontSize(parseInt(safeStorage.getItem('ham_font_size') || '14'));
      setEditorTheme(safeStorage.getItem('ham_editor_theme') || 'vs-dark');
      setShowMinimap(safeStorage.getItem('ham_show_minimap') === 'true');
      setAiRamLimit(parseInt(safeStorage.getItem('ham_ai_ram_limit') || '2'));
      setPerformanceMode(safeStorage.getItem('ham_performance_mode') === 'true');
      setStealthMode(safeStorage.getItem('ham_stealth_mode') === 'true');
      
      const storedGithubToken = safeStorage.getItem('ham_github_token');
      if (storedGithubToken) {
        setGithubToken(storedGithubToken);
        verifyGithubToken(storedGithubToken, true); // Silent verify
      }
      setAutoSync(safeStorage.getItem('ham_github_autosync') === 'true');
    }
  }, [isOpen]);

  const handleSave = () => {
    safeStorage.setItem('ham_project_type', projectType);
    safeStorage.setItem('ham_ai_model', aiModel);
    safeStorage.setItem('kaggle_llm_endpoint', kaggleEndpoint);
    safeStorage.setItem('kaggle_llm_api_key', kaggleApiKey);
    safeStorage.setItem('kaggle_username', kaggleUsername);
    safeStorage.setItem('kaggle_kernel_slug', kaggleKernelSlug);
    safeStorage.setItem('ham_theme', theme);
    safeStorage.setItem('ham_alternate_api_key', alternateApiKey);
    safeStorage.setItem('ham_supabase_url', supabaseUrl);
    safeStorage.setItem('ham_supabase_anon_key', supabaseAnonKey);
    safeStorage.setItem('ham_groq_api_key', groqApiKey);
    safeStorage.setItem('ham_github_token', githubToken);
    safeStorage.setItem('ham_github_autosync', String(autoSync));
    safeStorage.setItem('ham_font_size', String(fontSize));
    safeStorage.setItem('ham_editor_theme', editorTheme);
    safeStorage.setItem('ham_show_minimap', String(showMinimap));
    safeStorage.setItem('ham_ai_ram_limit', String(aiRamLimit));
    safeStorage.setItem('ham_performance_mode', String(performanceMode));
    safeStorage.setItem('ham_stealth_mode', String(stealthMode));
    
    // Sync to Native if available
    if (nativeBridge.isAvailable()) {
      nativeBridge.call('setPerformanceMode', performanceMode);
      nativeBridge.call('setAiRamLimit', aiRamLimit);
      nativeBridge.call('setStealthMode', stealthMode);
      if (alternateApiKey) nativeBridge.call('setAIKey', alternateApiKey);
      if (supabaseUrl && supabaseAnonKey) nativeBridge.call('setSupabaseConfig', supabaseUrl, supabaseAnonKey);
      if (groqApiKey) nativeBridge.call('setGroqKey', groqApiKey);
      if (githubToken) nativeBridge.call('setGithubToken', githubToken);
    }

    // Sync keys to AI Worker immediately
    import('../../../../services/aiWorkerService').then(({ AiWorkerService }) => {
      AiWorkerService.syncKeys().catch(err => {
        console.error('Failed to sync keys to AI Worker:', err);
      });
    }).catch(err => {
      console.error('Failed to sync keys to AI Worker:', err);
    });
    
    // Dispatch event for components to pick up changes immediately
    window.dispatchEvent(new CustomEvent('ham-settings-changed', {
      detail: {
        fontSize,
        editorTheme,
        showMinimap
      }
    }));
    
    onProjectTypeChange(projectType);
    showToast('Settings saved successfully!', 'success');
    onClose();
  };

  const handleSyncKey = async () => {
    if (!alternateApiKey) return;
    setIsSyncingKey(true);
    
    try {
      const sanitizedKey = alternateApiKey.trim().replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
      
      // Reject common placeholder or invalid strings
      const invalidValues = ['undefined', 'null', 'your_api_key', 'your_gemini_api_key', 'placeholder', '[object object]'];
      if (invalidValues.includes(sanitizedKey.toLowerCase())) {
        throw new Error('API Key is invalid (placeholder or undefined)');
      }

      // Verify the specific key provided
      const tempClient = new GoogleGenAI({ apiKey: sanitizedKey });
      await tempClient.models.countTokens({ 
        model: 'gemini-2.5-flash', 
        contents: [{ role: 'user', parts: [{ text: 'test' }] }] 
      });

      safeStorage.setItem('ham_alternate_api_key', sanitizedKey);
      setAlternateApiKey(sanitizedKey);
      
      // Sync to Native Android KeyStore if available
      if (nativeBridge.isAvailable()) {
        nativeBridge.call('setAIKey', sanitizedKey);
      }
      
      showToast('Ham Engine API Key verified and synced successfully!', 'success');
    } catch (error: any) {
      console.error("API Key Validation Failed", error);
      showToast(`Validation Failed: ${error.message || 'Invalid API Key'}`, 'error');
    } finally {
      setIsSyncingKey(false);
    }
  };

  const handleResetDefaults = async () => {
    if (await confirm('Are you sure you want to reset all settings to default?')) {
        setProjectType('apk');
        setAiModel('kaggle-llm');
        setKaggleEndpoint('');
        setKaggleApiKey('');
        setKaggleUsername('');
        setKaggleKernelSlug('');
        setTheme('system');
        setAlternateApiKey('');
        setSupabaseUrl('');
        setSupabaseAnonKey('');
        setGroqApiKey('');
        setFontSize(14);
        setEditorTheme('vs-dark');
        setShowMinimap(false);
        setAiRamLimit(2);
        setPerformanceMode(false);
        setStealthMode(false);
        setAutoSync(false);
        
        if (nativeBridge.isAvailable()) {
          nativeBridge.call('setPerformanceMode', false);
          nativeBridge.call('setAiRamLimit', 2);
          nativeBridge.call('setStealthMode', false);
          nativeBridge.call('setAIKey', '');
          nativeBridge.call('setSupabaseConfig', '', '');
          nativeBridge.call('setGroqKey', '');
          nativeBridge.call('setGithubToken', '');
          nativeBridge.call('clearNativeBrowserData');
        }
        
        safeStorage.clear(); // Clear all storage
        window.location.reload();
    }
  };

  const handleToggleStealthMode = (enabled: boolean) => {
    setStealthMode(enabled);
    safeStorage.setItem('ham_stealth_mode', String(enabled));
    if (nativeBridge.isAvailable()) {
      nativeBridge.call('setStealthMode', enabled);
    }
  };

  const handleClearNativeData = async () => {
    if (await confirm('Are you sure you want to clear all native browser data (history, bookmarks, cache)?')) {
      if (nativeBridge.isAvailable()) {
        nativeBridge.call('clearNativeBrowserData');
        showToast('Native data cleared successfully!', 'success');
      } else {
        showToast('Native bridge not available', 'error');
      }
    }
  };

  const handleSyncSupabase = async () => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    setIsSyncingSupabase(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.from('_non_existent_table_').select('*').limit(1);
      // If error is 401, it's invalid key. If it's 404, the key is valid but table doesn't exist (which is fine for validation)
      if (error && error.code === 'PGRST301') throw new Error('Invalid API Key');
      
      safeStorage.setItem('ham_supabase_url', supabaseUrl);
      safeStorage.setItem('ham_supabase_anon_key', supabaseAnonKey);
      showToast('Supabase credentials verified successfully!', 'success');
    } catch (error: any) {
      showToast(`Supabase Validation Failed: ${error.message}`, 'error');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleSyncGroq = async () => {
    if (!groqApiKey) return;
    setIsSyncingGroq(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${groqApiKey}` }
      });
      if (!response.ok) throw new Error('Invalid Groq API Key');
      
      safeStorage.setItem('ham_groq_api_key', groqApiKey);
      showToast('Groq API Key verified successfully!', 'success');
    } catch (error: any) {
      showToast(`Groq Validation Failed: ${error.message}`, 'error');
    } finally {
      setIsSyncingGroq(false);
    }
  };

  const verifyGithubToken = async (token: string, silent = false) => {
    if (!token) return;
    setIsVerifyingGithub(true);
    try {
      const user = await githubService.verifyToken(token);
      setGithubUser(user);
      if (!silent) showToast(`Connected as ${user.login}`, 'success');
    } catch (error: any) {
      console.error("GitHub Verification Failed", error);
      setGithubUser(null);
      if (!silent) showToast(`Invalid GitHub Token: ${error.message}`, 'error');
    } finally {
      setIsVerifyingGithub(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const results = await Promise.allSettled([
        handleSyncKey(),
        handleSyncSupabase(),
        handleSyncGroq(),
        githubToken ? verifyGithubToken(githubToken, true) : Promise.resolve()
      ]);
      
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length === 0) {
        showToast('All services synced and verified successfully!', 'success');
      } else {
        showToast(`${failed.length} services failed to sync. Please check individual settings.`, 'error');
      }
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Touch handling for swipe down to close
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const isDownSwipe = distance < -50;

    if (isDownSwipe) {
      onClose();
    }
    
    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  return {
    projectType, setProjectType,
    aiModel, setAiModel,
    kaggleEndpoint, setKaggleEndpoint,
    kaggleApiKey, setKaggleApiKey,
    kaggleUsername, setKaggleUsername,
    kaggleKernelSlug, setKaggleKernelSlug,
    alternateApiKey, setAlternateApiKey,
    supabaseUrl, setSupabaseUrl,
    supabaseAnonKey, setSupabaseAnonKey,
    groqApiKey, setGroqApiKey,
    isSyncingKey,
    isSyncingSupabase,
    isSyncingGroq,
    isSyncingAll,
    githubToken, setGithubToken,
    githubUser, setGithubUser,
    isVerifyingGithub,
    autoSync, setAutoSync,
    fontSize, setFontSize,
    editorTheme, setEditorTheme,
    showMinimap, setShowMinimap,
    aiRamLimit, setAiRamLimit,
    performanceMode, setPerformanceMode,
    stealthMode, setStealthMode: handleToggleStealthMode,
    theme, setTheme,
    handleSave,
    handleSyncKey,
    handleSyncSupabase,
    handleSyncGroq,
    handleSyncAll,
    verifyGithubToken,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleResetDefaults,
    handleClearNativeData
  };
}
