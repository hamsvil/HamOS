 
import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, CheckCircle } from 'lucide-react';
import { SecureVault } from '../SecureVault';

export const HASSettingsModal = () => {
    const [syncing, setSyncing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [keys, setKeys] = useState({ gemini: '' });

    useEffect(() => {
        const loadKeys = async () => {
            const gemini = await SecureVault.getKey('GEMINI_API_KEY') || localStorage.getItem('ham_alternate_api_key') || '';
            setKeys({ gemini });
        };
        loadKeys();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await SecureVault.setKey('GEMINI_API_KEY', keys.gemini);
            localStorage.setItem('ham_alternate_api_key', keys.gemini);
            setSyncing(false); 
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (_e) {
            setSyncing(false);
            setStatus('error');
        }
    };

    return (
        <div className="p-6 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all duration-700"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Key className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">API Key Manager</h3>
            </div>
            
            <div className="space-y-4 relative z-10 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {/* Gemini */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Gemini API Key</label>
                        <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                            Get Key <RefreshCw size={10} className="rotate-45" />
                        </a>
                    </div>
                    <input type="password" value={keys.gemini} onChange={(e) => setKeys({...keys, gemini: e.target.value})} placeholder="AIzaSy..." className="w-full px-4 py-3 bg-zinc-950/40 border border-zinc-800/50 rounded-xl text-sm text-zinc-100 focus:border-blue-500/30 outline-none transition-all" />
                </div>
            </div>
            
            <div className="mt-5 relative z-10">
                <button onClick={handleSync} disabled={syncing} className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all duration-500 flex justify-center items-center gap-2.5 shadow-xl ${status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-900/20 border border-blue-400/20'}`}>
                    {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                    {syncing ? 'Synchronizing...' : status === 'success' ? 'Vault Updated' : 'Sync to SecureVault'}
                </button>
            </div>
        </div>
    );
};