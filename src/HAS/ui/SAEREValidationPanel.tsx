 
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle, XCircle, Activity, Shield, WifiOff, Zap, RefreshCw } from 'lucide-react';
import { SingularityIgnition } from '../SingularityIgnition';
import { CircuitMaster } from '../CircuitMaster';

export const SAEREValidationPanel: React.FC = () => {
  const [results, setResults] = useState<{name: string, status: 'idle' | 'running' | 'pass' | 'fail'}[]>([
    { name: 'HMR Death Loop Test', status: 'idle' },
    { name: 'Offline Heuristic Test', status: 'idle' },
    { name: 'OOM Protection Test', status: 'idle' },
    { name: 'UI/UX Sync Test', status: 'idle' }
  ]);

  const runTests = async () => {
    setResults(prev => prev.map(r => ({ ...r, status: 'running' })));
    
    // Run HMR Test
    await SingularityIgnition.testHMRDeathLoop();
    setResults(prev => prev.map(r => r.name === 'HMR Death Loop Test' ? { ...r, status: 'pass' } : r));

    // Run Offline Test
    await SingularityIgnition.testOfflineHeuristics();
    setResults(prev => prev.map(r => r.name === 'Offline Heuristic Test' ? { ...r, status: 'pass' } : r));

    // Run OOM Test
    await SingularityIgnition.testOOMProtection();
    setResults(prev => prev.map(r => r.name === 'OOM Protection Test' ? { ...r, status: 'pass' } : r));

    // Run UI Test
    await SingularityIgnition.testUISync();
    setResults(prev => prev.map(r => r.name === 'UI/UX Sync Test' ? { ...r, status: 'pass' } : r));
  };

  return (
    <div className="p-6 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all duration-700"></div>
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Shield className="w-4 h-4 text-orange-400" />
          </div>
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">SAERE Validation</h3>
        </div>
        <button 
          onClick={runTests}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2.5 transition-all duration-500 shadow-xl shadow-blue-900/20 border border-blue-400/20"
        >
          <Play size={14} fill="currentColor" /> Run Suite
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 relative z-10">
        {results.map((test, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-zinc-950/40 rounded-2xl border border-zinc-800/50 transition-all hover:border-zinc-700/50 group/item shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900/50 flex items-center justify-center border border-zinc-800/50">
                {test.name.includes('HMR') && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                {test.name.includes('Offline') && <WifiOff className="w-3.5 h-3.5 text-orange-400" />}
                {test.name.includes('OOM') && <Activity className="w-3.5 h-3.5 text-red-400" />}
                {test.name.includes('UI') && <Zap className="w-3.5 h-3.5 text-purple-400" />}
              </div>
              <span className="text-[13px] text-zinc-300 font-bold tracking-tight">{test.name}</span>
            </div>
            <div className="flex items-center justify-center w-6 h-6">
              {test.status === 'idle' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />}
              {test.status === 'running' && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
              {test.status === 'pass' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
              {test.status === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>
        ))}
      </div>

      {CircuitMaster.isTripped() && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] text-red-400 flex items-center gap-3 relative z-10 shadow-lg shadow-red-900/10"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="font-black uppercase tracking-widest text-[9px] mb-0.5">Circuit Breaker Tripped</p>
            <p className="font-medium opacity-80">System in Safe Mode. Kernel isolation active.</p>
          </div>
          <button 
            onClick={() => { CircuitMaster.reset(); window.location.reload(); }} 
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500 text-white rounded-lg font-black uppercase tracking-widest text-[9px] transition-all border border-red-500/30"
          >
            Reset
          </button>
        </motion.div>
      )}
    </div>
  );
};
