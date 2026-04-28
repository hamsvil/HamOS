 
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, ChevronDown, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { SecureVault } from '../SecureVault';

export const HASCoreMemory = () => {
    const [open, setOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [directives, setDirectives] = useState('');

    useEffect(() => {
        SecureVault.getKey('CORE_DIRECTIVES').then(val => {
            if (val) setDirectives(val);
        });
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        await SecureVault.setKey('CORE_DIRECTIVES', directives);
        setTimeout(() => setSyncing(false), 1500);
    };
    return (
        <div className="mt-4">
            <button 
                onClick={() => setOpen(!open)} 
                className={`w-full p-5 rounded-[2rem] text-left font-black text-sm border transition-all duration-500 flex justify-between items-center shadow-xl relative overflow-hidden group ${
                    open 
                    ? 'bg-zinc-900 border-red-500/30 text-red-400' 
                    : 'bg-zinc-900/30 border-zinc-800/50 text-zinc-400 hover:bg-zinc-900/50'
                }`}
            >
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-[48px] rounded-full -mr-12 -mt-12 group-hover:bg-red-500/10 transition-all duration-700"></div>
                
                <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${open ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                        <Brain className={`w-4 h-4 ${open ? 'text-red-400' : 'text-zinc-500'}`} />
                    </div>
                    <span className="uppercase tracking-[0.2em] text-[10px] font-black">Core Directives</span>
                </div>
                <div className="relative z-10">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            </button>
            
            {open && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-6 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl space-y-5 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/5 blur-[64px] rounded-full -ml-16 -mb-16 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <textarea 
                            value={directives}
                            onChange={(e) => setDirectives(e.target.value)}
                            className="w-full h-40 bg-zinc-950/40 border border-zinc-800/50 p-5 rounded-2xl text-[13px] text-zinc-200 outline-none focus:border-red-500/30 focus:bg-zinc-950/60 transition-all resize-none custom-scrollbar placeholder:text-zinc-800 shadow-inner leading-relaxed" 
                            placeholder="Inject permanent instructions into HIMOS L1 Cache..."
                        ></textarea>
                        <div className="absolute bottom-4 right-4">
                            <Zap className="w-4 h-4 text-zinc-800" />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSync} 
                        disabled={syncing} 
                        className="w-full bg-gradient-to-r from-red-600/10 to-red-700/10 hover:from-red-600 hover:to-red-700 text-red-400 hover:text-white border border-red-500/20 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex justify-center items-center gap-2.5 transition-all duration-500 shadow-xl shadow-red-900/10"
                    >
                        {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        {syncing ? 'Syncing Memory...' : 'Sync Core Memory'}
                    </button>
                    
                    <p className="text-[9px] text-zinc-600 text-center uppercase tracking-[0.2em] font-bold relative z-10">
                        Directives persist across session restarts
                    </p>
                </motion.div>
            )}
        </div>
    );
};