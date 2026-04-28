import React from 'react';
// General Section Component
import { Globe } from 'lucide-react';
import { GeneralSectionProps } from './types';
import { safeStorage } from '../../utils/storage';
import { useConfirm } from '../../context/ConfirmContext';

export default function GeneralSection({ settings, handleSave, toggleSetting, t, language, setLanguage }: GeneralSectionProps) {
  const { confirm } = useConfirm();
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
        <Globe className="text-violet-400" /> {t('settings.general')}
      </h3>
      
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 space-y-4 shadow-xl shadow-black/20">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">{t('settings.searchEngine')}</h4>
            <p className="text-sm text-[var(--text-secondary)]">{t('settings.searchEngineDesc')}</p>
          </div>
          <select 
            value={settings.searchEngine}
            onChange={(e) => handleSave({ ...settings, searchEngine: e.target.value })}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:border-violet-500/50 outline-none text-[var(--text-primary)] transition-all"
          >
            <option>Google (Ham Enhanced)</option>
            <option>DuckDuckGo</option>
            <option>Bing</option>
          </select>
        </div>
        <div className="h-px bg-[var(--border-color)]/50" />
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">{t('settings.language')}</h4>
            <p className="text-sm text-[var(--text-secondary)]">{t('settings.languageDesc')}</p>
          </div>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:border-violet-500/50 outline-none text-[var(--text-primary)] transition-all"
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English (US)</option>
            <option value="ja">日本語 (Japanese)</option>
            <option value="es">Español (Spanish)</option>
            <option value="fr">Français (French)</option>
            <option value="de">Deutsch (German)</option>
            <option value="ko">한국어 (Korean)</option>
            <option value="zh">中文 (Chinese)</option>
            <option value="ar">العربية (Arabic)</option>
            <option value="ru">Русский (Russian)</option>
            <option value="pt">Português (Portuguese)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </div>
        <div className="h-px bg-[var(--border-color)]/50" />
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">{t('settings.defaultBrowser')}</h4>
            <p className="text-sm text-[var(--text-secondary)]">{t('settings.defaultBrowserDesc')}</p>
          </div>
          <button 
            onClick={() => toggleSetting('defaultBrowser')}
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 border ${settings.defaultBrowser ? 'bg-violet-500/20 text-violet-400 border-violet-500/50 shadow-lg shadow-violet-500/10' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-violet-500/30'}`}
          >
            {settings.defaultBrowser ? t('settings.installed') : t('settings.setAsDefault')}
          </button>
        </div>
        <div className="h-px bg-[var(--border-color)]/50" />
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">{t('settings.reset')}</h4>
            <p className="text-sm text-[var(--text-secondary)]">{t('settings.resetDesc')}</p>
          </div>
          <button 
            onClick={async () => {
              if (await confirm('Reset semua pengaturan ke default?')) {
                safeStorage.removeItem('quantum_settings');
                window.location.reload();
              }
            }}
            className="px-4 py-2 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all active:scale-[0.98]"
          >
            {t('settings.resetBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
