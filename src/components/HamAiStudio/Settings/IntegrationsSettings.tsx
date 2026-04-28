import React from 'react';
import { Key, RefreshCw, ExternalLink, CloudUpload, Cpu, CheckCircle } from 'lucide-react';

const Github = ({ size }: { size?: number }) => <div style={{ width: size, height: size }} className="flex items-center justify-center font-bold">G</div>;
import { SettingsSection } from './SettingsSection';
import { GitHubUser } from '../../../services/githubService';
import { safeStorage } from '../../../utils/storage';

interface IntegrationsSettingsProps {
  alternateApiKey: string;
  setAlternateApiKey: (value: string) => void;
  isSyncingKey: boolean;
  handleSyncKey: () => void;
  
  supabaseUrl: string;
  setSupabaseUrl: (value: string) => void;
  supabaseAnonKey: string;
  setSupabaseAnonKey: (value: string) => void;
  isSyncingSupabase: boolean;
  handleSyncSupabase: () => void;
  
  groqApiKey: string;
  setGroqApiKey: (value: string) => void;
  isSyncingGroq: boolean;
  handleSyncGroq: () => void;
  
  githubUser: GitHubUser | null;
  setGithubUser: (user: GitHubUser | null) => void;
  githubToken: string;
  setGithubToken: (value: string) => void;
  isVerifyingGithub: boolean;
  verifyGithubToken: (token: string) => void;
  autoSync: boolean;
  setAutoSync: (value: boolean) => void;
}

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({
  alternateApiKey, setAlternateApiKey, isSyncingKey, handleSyncKey,
  supabaseUrl, setSupabaseUrl, supabaseAnonKey, setSupabaseAnonKey, isSyncingSupabase, handleSyncSupabase,
  groqApiKey, setGroqApiKey, isSyncingGroq, handleSyncGroq,
  githubUser, setGithubUser, githubToken, setGithubToken, isVerifyingGithub, verifyGithubToken, autoSync, setAutoSync
}) => {
  return (
    <>
      {/* Alternate API Key Section - Top Priority */}
      <SettingsSection title="Ham Engine API Key" icon={<Key size={16} className="text-yellow-400" />}>
        <div className="space-y-2">
          <p className="text-[10px] text-[var(--text-secondary)]">
            Digunakan untuk fitur AI (Chat, Code Generation, Debugging).
          </p>
          <div className="flex gap-2">
            <input 
              type="password" 
              value={alternateApiKey}
              onChange={(e) => setAlternateApiKey(e.target.value)}
              placeholder="Paste Ham Engine API Key here..."
              className="flex-1 px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all text-xs"
            />
            <button 
              onClick={handleSyncKey}
              disabled={!alternateApiKey || isSyncingKey}
              className={`px-3 py-1.5 text-xs font-medium text-black bg-yellow-400 hover:bg-yellow-300 rounded-md transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/20 ${isSyncingKey ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={14} className={isSyncingKey ? 'animate-spin' : ''} />
              {isSyncingKey ? 'Verifying...' : 'Sync'}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-color)]">
            <span className="text-[10px] text-[var(--text-secondary)]">Belum punya API Key?</span>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Dapatkan Ham Engine API Key <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </SettingsSection>

      {/* Supabase Section */}
      <SettingsSection title="Supabase Configuration" icon={<CloudUpload size={16} className="text-emerald-400" />}>
        <div className="space-y-2">
          <input 
            type="text" 
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="Supabase Project URL (https://...)"
            className="w-full px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-xs"
          />
          <div className="flex gap-2">
            <input 
              type="password" 
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="Supabase Anon Key"
              className="flex-1 px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-xs"
            />
            <button 
              onClick={handleSyncSupabase}
              disabled={!supabaseUrl || !supabaseAnonKey || isSyncingSupabase}
              className={`px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-all flex items-center gap-2 ${isSyncingSupabase ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={14} className={isSyncingSupabase ? 'animate-spin' : ''} />
              Sync
            </button>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--border-color)]">
            <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
              Dapatkan Supabase Key <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </SettingsSection>

      {/* Groq Section */}
      <SettingsSection title="Groq API Key" icon={<Cpu size={16} className="text-orange-400" />}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input 
              type="password" 
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="Groq API Key (gsk_...)"
              className="flex-1 px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all text-xs"
            />
            <button 
              onClick={handleSyncGroq}
              disabled={!groqApiKey || isSyncingGroq}
              className={`px-3 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-500 rounded-md transition-all flex items-center gap-2 ${isSyncingGroq ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={14} className={isSyncingGroq ? 'animate-spin' : ''} />
              Sync
            </button>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--border-color)]">
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
              Dapatkan Groq Key <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </SettingsSection>

      {/* GitHub Integration Section */}
      <SettingsSection title="GitHub Integration" icon={<Github size={16} />}>
        <div className="space-y-3">
           <p className="text-[10px] text-[var(--text-secondary)]">
            Hubungkan akun GitHub untuk menyimpan project otomatis. Gunakan Personal Access Token (Classic) dengan scope <code>repo</code>.
          </p>
          
          {!githubUser ? (
            <div className="flex gap-2">
              <input 
                type="password" 
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="flex-1 px-2.5 py-1.5 border border-[var(--border-color)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs"
              />
              <button 
                onClick={() => verifyGithubToken(githubToken)}
                disabled={!githubToken || isVerifyingGithub}
                className={`px-3 py-1.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-all flex items-center gap-2 ${isVerifyingGithub ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isVerifyingGithub ? <RefreshCw size={14} className="animate-spin" /> : 'Connect'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[var(--bg-tertiary)] p-2 rounded-md border border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <img src={githubUser.avatar_url} alt={githubUser.login} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{githubUser.login}</span>
                  <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle size={8} /> Connected</span>
                </div>
              </div>
              <button 
                onClick={() => { setGithubUser(null); setGithubToken(''); safeStorage.removeItem('ham_github_token'); }}
                className="text-[10px] text-red-400 hover:text-red-300 underline"
              >
                Disconnect
              </button>
            </div>
          )}

          {githubUser && (
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="autosync"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="autosync" className="text-xs text-[var(--text-primary)] cursor-pointer select-none">
                Auto-sync generated projects to GitHub
              </label>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--border-color)]">
             <a 
              href="https://github.com/settings/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Generate Token <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </SettingsSection>
    </>
  );
};
