 
import React from 'react';
import { Cpu, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAIHubStore } from '../../store/aiHubStore';
import { CLONES } from '../../constants/aiClones';

export const HASModelExplorer = () => {
    const { activeClone, engineStatuses, setActiveClone } = useAIHubStore();

    return (
        <div className="p-6 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Model Explorer</h3>
            </div>
            
            <ul className="space-y-3 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {CLONES.map((clone) => {
                    const isActive = activeClone.id === clone.id;
                    const status = engineStatuses[clone.id] || 'pending';
                    
                    let statusColor = 'bg-zinc-500';
                    let statusText = 'Pending';
                    let StatusIcon = null;

                    if (status === 'ready') {
                        statusColor = 'bg-emerald-400';
                        statusText = 'Ready';
                    } else if (status === 'initializing') {
                        statusColor = 'bg-yellow-400';
                        statusText = 'Preparing';
                        StatusIcon = Loader2;
                    } else if (status === 'error') {
                        statusColor = 'bg-red-500';
                        statusText = 'Error';
                        StatusIcon = AlertCircle;
                    }

                    return (
                        <li 
                            key={clone.id}
                            onClick={() => status === 'ready' && setActiveClone(clone)}
                            className={`flex justify-between items-center p-5 rounded-2xl border transition-all shadow-inner cursor-pointer
                                ${isActive ? 'bg-zinc-950/40 border-emerald-500/30' : 'bg-zinc-950/20 border-zinc-800/50 hover:border-zinc-700/50'}
                                ${status !== 'ready' ? 'opacity-60' : ''}
                            `}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <clone.icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                    <p className={`text-sm font-black tracking-tight ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                        {clone.name}
                                    </p>
                                </div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                                    {clone.model} • {clone.provider}
                                </p>
                            </div>
                            
                            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg
                                ${isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-900/10' : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800/50'}
                            `}>
                                <div className={`w-1.5 h-1.5 rounded-full ${statusColor} ${status === 'initializing' ? 'animate-pulse' : ''}`}></div>
                                {isActive ? 'Active' : statusText}
                                {StatusIcon && <StatusIcon className={`w-3 h-3 ${status === 'initializing' ? 'animate-spin' : ''}`} />}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};