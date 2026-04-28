 
import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, List, Plus, Trash2 } from 'lucide-react';
import { MultiProviderRouter } from '../MultiProviderRouter';

export const HASQueueManager = () => {
    const [syncing, setSyncing] = useState(false);
    const [queue, setQueue] = useState<string[]>([]);
    const [newModel, setNewModel] = useState('');

    useEffect(() => {
        setQueue(MultiProviderRouter.getQueue());
        const handleUpdate = (e: any) => setQueue(e.detail);
        window.addEventListener('saere-queue-updated', handleUpdate);
        return () => window.removeEventListener('saere-queue-updated', handleUpdate);
    }, []);

    const handleSync = () => {
        setSyncing(true);
        MultiProviderRouter.setQueue(queue);
        setTimeout(() => setSyncing(false), 800);
    };

    const addModel = () => {
        if (newModel.trim() && !queue.includes(newModel.trim())) {
            setQueue([...queue, newModel.trim()]);
            setNewModel('');
        }
    };

    const removeModel = (model: string) => {
        setQueue(queue.filter(m => m !== model));
    };

    return (
        <div className="p-6 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-all duration-700"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Model Queue</h3>
            </div>
            
            <div className="flex gap-2 relative z-10 mb-4">
                <input 
                    type="text" 
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addModel()}
                    placeholder="Add model (e.g. claude-3-haiku)" 
                    className="flex-1 px-4 py-3 bg-zinc-950/40 border border-zinc-800/50 rounded-xl text-sm text-zinc-100 outline-none focus:border-purple-500/30 transition-all shadow-inner placeholder:text-zinc-800" 
                />
                <button onClick={addModel} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-xl transition-colors">
                    <Plus size={16} />
                </button>
            </div>
            
            <div className="relative z-10 mb-5">
                <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-950/20 shadow-inner max-h-[200px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-[11px] text-left">
                        <thead className="bg-zinc-900/40 text-zinc-500 border-b border-zinc-900/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 font-black uppercase tracking-widest">Model</th>
                                <th className="px-4 py-2 font-black uppercase tracking-widest text-right">Act</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/30">
                            {queue.map((model, idx) => (
                                <tr key={model} className="hover:bg-zinc-900/20 transition-colors">
                                    <td className="px-4 py-3 font-bold text-zinc-300 flex items-center gap-2">
                                        <span className="text-zinc-600 font-mono text-[9px]">{(idx + 1).toString().padStart(2, '0')}</span>
                                        {model}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => removeModel(model)} className="text-zinc-600 hover:text-red-400 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <button 
                onClick={handleSync} 
                className="w-full relative z-10 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex justify-center items-center gap-2.5 transition-all duration-500 shadow-xl shadow-purple-900/20 border border-purple-400/20"
            >
                {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <List className="w-3.5 h-3.5" />}
                {syncing ? 'Syncing...' : 'Sync Queue'}
            </button>
        </div>
    );
};
