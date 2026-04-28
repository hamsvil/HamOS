 
import React from 'react';
import { useProjectStore } from '../../store/projectStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, RefreshCw, Trash2, Home } from 'lucide-react';

export const SafeModeOverlay: React.FC = () => {
  const error = useProjectStore(state => state.uiState.error);
  const setError = useProjectStore(state => state.setUiState);
  const handleRestore = useProjectStore(state => state.saveImmediately); // Simplified for now

  if (!error) return null;

  const handleReset = async () => {
    try {
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear IndexedDB
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      });

      // Clear OPFS (Origin Private File System)
      if ('storage' in navigator && 'getDirectory' in navigator.storage) {
        const root = await navigator.storage.getDirectory();
        // @ts-ignore
        for await (const [name] of root.entries()) {
          await root.removeEntry(name, { recursive: true });
        }
      }

      window.location.reload();
    } catch (e) {
      console.error('Hard reset failed:', e);
      // Fallback to basic reload
      window.location.reload();
    }
  };

  const handleHome = () => {
    setError({ error: null });
    window.location.href = '/';
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
      >
        <div className="max-w-md w-full bg-zinc-900 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-500/10 p-8 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">{error.title || 'System Interrupted'}</h2>
          <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
            {error.message || 'An unexpected error occurred. The system has entered Safe Mode to protect your project data.'}
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-zinc-100 transition-all active:scale-95"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Retry</span>
            </button>
            <button 
              onClick={handleHome}
              className="flex items-center justify-center gap-2 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-zinc-100 transition-all active:scale-95"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>
            <button 
              onClick={handleReset}
              className="col-span-2 flex items-center justify-center gap-2 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-500 transition-all active:scale-95"
            >
              <Trash2 className="w-5 h-5" />
              <span>Hard Reset (Clear All Data)</span>
            </button>
          </div>
          
          <p className="mt-8 text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
            Singularity Protocol Active
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
