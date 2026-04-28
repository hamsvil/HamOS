import React from 'react';
import { X, Plus, Trash2, BrainCircuit, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';

interface AIHubSidebarProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  sessions: { id: string; title: string; timestamp: number }[];
  currentSessionId: string;
  setCurrentSessionId: (id: string) => void;
  createNewSession: () => void;
  clearAllHistory: () => void;
  deleteSession: (sid: string, e: React.MouseEvent) => void;
}

export default function AIHubSidebar({
  showHistory,
  setShowHistory,
  sessions,
  currentSessionId,
  setCurrentSessionId,
  createNewSession,
  clearAllHistory,
  deleteSession
}: AIHubSidebarProps) {
  return (
    <AnimatePresence>
      {showHistory && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistory(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[55] lg:hidden"
          />
          
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 left-0 z-[60] w-72 bg-zinc-950/90 backdrop-blur-2xl border-r border-zinc-800/50 shadow-2xl"
          >
            <div className="flex flex-col h-full p-4">
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-2">
                  <History size={14} className="text-emerald-400" />
                  <h3 className="text-zinc-400 font-bold tracking-[0.2em] text-[10px] uppercase">Neural History</h3>
                </div>
                <button 
                  onClick={() => setShowHistory(false)} 
                  className="p-1.5 rounded-lg hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all mb-6 text-xs font-bold uppercase tracking-wider"
              >
                <Plus size={16} />
                <span>New Session</span>
              </motion.button>
              
              <div className="flex-1 min-h-0 pr-2 custom-scrollbar">
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3 px-2 flex justify-between items-center">
                  <span>Recent Logs</span>
                  <button 
                    onClick={clearAllHistory} 
                    className="hover:text-red-400 transition-colors p-1" 
                    title="Purge All History"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="h-[calc(100vh-250px)]">
                  <Virtuoso
                    data={sessions}
                    itemContent={(index, s) => (
                      <div className="pb-1.5">
                        <motion.div 
                          key={s.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => { setCurrentSessionId(s.id); setShowHistory(false); }}
                          className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all relative overflow-hidden ${
                            s.id === currentSessionId 
                              ? 'bg-zinc-900 border border-zinc-700/50 shadow-inner' 
                              : 'hover:bg-zinc-900/40 border border-transparent hover:border-zinc-800/50'
                          }`}
                        >
                          {s.id === currentSessionId && (
                            <motion.div 
                              layoutId="active-session-indicator"
                              className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"
                            />
                          )}
                          
                          <div className="flex items-center gap-3 overflow-hidden">
                            <BrainCircuit size={14} className={s.id === currentSessionId ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
                            <span className={`text-xs truncate ${s.id === currentSessionId ? 'text-zinc-100 font-semibold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                              {s.title}
                            </span>
                          </div>
                          
                          <button 
                            onClick={(e) => deleteSession(s.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      </div>
                    )}
                  />
                </div>
              </div>

              {sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History size={32} className="text-zinc-800 mb-3" />
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">No sessions found</p>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-zinc-800/50">
                <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-zinc-900/30 border border-zinc-800/30">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <BrainCircuit size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-200">Neural Architect</span>
                    <span className="text-[8px] text-zinc-500 uppercase tracking-tighter">Active Sync: 100%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
