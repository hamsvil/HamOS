import React from 'react';
import { X, Save, RefreshCw, Settings } from 'lucide-react';
import { useSettingsLogic } from './Settings/hooks/useSettingsLogic';
import { IntegrationsSettings } from './Settings/IntegrationsSettings';
import { AISettings } from './Settings/AISettings';
import { GeneralSettings } from './Settings/GeneralSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectTypeChange: (type: string) => void;
}

export default function SettingsModal({ isOpen, onClose, onProjectTypeChange }: SettingsModalProps) {
  const {
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
    stealthMode, setStealthMode,
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
  } = useSettingsLogic(isOpen, onClose, onProjectTypeChange);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[var(--border-color)]">
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-blue-400" />
            <h3 className="font-semibold text-[var(--text-primary)]">IDE Settings</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md text-[10px] font-bold uppercase transition-all border border-blue-500/20"
            >
              <RefreshCw size={12} className={isSyncingAll ? 'animate-spin' : ''} />
              {isSyncingAll ? 'Syncing...' : 'Sync All'}
            </button>
            <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-blue-400 rounded-full hover:bg-[var(--bg-secondary)] transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-3 space-y-3 bg-[var(--bg-secondary)] max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent">
          
          <IntegrationsSettings
            alternateApiKey={alternateApiKey} setAlternateApiKey={setAlternateApiKey}
            isSyncingKey={isSyncingKey} handleSyncKey={handleSyncKey}
            supabaseUrl={supabaseUrl} setSupabaseUrl={setSupabaseUrl}
            supabaseAnonKey={supabaseAnonKey} setSupabaseAnonKey={setSupabaseAnonKey}
            isSyncingSupabase={isSyncingSupabase} handleSyncSupabase={handleSyncSupabase}
            groqApiKey={groqApiKey} setGroqApiKey={setGroqApiKey}
            isSyncingGroq={isSyncingGroq} handleSyncGroq={handleSyncGroq}
            githubUser={githubUser} setGithubUser={setGithubUser}
            githubToken={githubToken} setGithubToken={setGithubToken}
            isVerifyingGithub={isVerifyingGithub} verifyGithubToken={verifyGithubToken}
            autoSync={autoSync} setAutoSync={setAutoSync}
          />

          <AISettings
            aiModel={aiModel} setAiModel={setAiModel}
            kaggleEndpoint={kaggleEndpoint} setKaggleEndpoint={setKaggleEndpoint}
            kaggleApiKey={kaggleApiKey} setKaggleApiKey={setKaggleApiKey}
            kaggleUsername={kaggleUsername} setKaggleUsername={setKaggleUsername}
            kaggleKernelSlug={kaggleKernelSlug} setKaggleKernelSlug={setKaggleKernelSlug}
            aiRamLimit={aiRamLimit} setAiRamLimit={setAiRamLimit}
          />

          <GeneralSettings
            projectType={projectType} setProjectType={setProjectType}
            theme={theme} setTheme={setTheme}
            editorTheme={editorTheme} setEditorTheme={setEditorTheme}
            showMinimap={showMinimap} setShowMinimap={setShowMinimap}
            performanceMode={performanceMode} setPerformanceMode={setPerformanceMode}
            fontSize={fontSize} setFontSize={setFontSize}
            stealthMode={stealthMode} setStealthMode={setStealthMode}
            handleClearNativeData={handleClearNativeData}
          />
          
        </div>
        
        <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] flex justify-between gap-2">
          <button 
            onClick={handleResetDefaults}
            className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
          >
            Reset Defaults
          </button>
          <div className="flex gap-2">
            <button 
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-md transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
                <Save size={16} />
                Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
