import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertTriangle, Terminal as TerminalIcon } from 'lucide-react';
import VirtualKeyboard from '../VirtualKeyboard';

interface TerminalViewProps {
  terminalRef: React.RefObject<HTMLDivElement | null>;
  isConnecting: boolean;
  error: string | null;
  handleRestart: () => void;
  isKeyboardVisible: boolean;
  handleVirtualKey: (key: string) => void;
  rows: number;
  cols: number;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  terminalRef,
  isConnecting,
  error,
  handleRestart,
  isKeyboardVisible,
  handleVirtualKey,
  rows,
  cols
}) => {
  return (
    <div className="flex flex-col h-full relative group">
      <div ref={terminalRef} className="flex-1 bg-[var(--bg-secondary)] overflow-hidden" />
      
      <AnimatePresence>
        {(isConnecting || error) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
          >
            <div className="bg-[#1e1e1e] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl text-center">
              {isConnecting && !error ? (
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-400">Establishing secure shell connection...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <h3 className="text-lg font-semibold text-white">Terminal Failure</h3>
                  <p className="text-sm text-gray-400">{error}</p>
                  <button 
                    onClick={handleRestart}
                    className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Emergency Restart
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-6 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between px-3 text-[10px] font-mono text-gray-500 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <TerminalIcon className="w-3 h-3" />
            <span>HAM-OS TERMINAL v2.5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnecting ? 'bg-amber-500 animate-pulse' : error ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span>{isConnecting ? 'CONNECTING' : error ? 'OFFLINE' : 'STABLE'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>LN: {rows} COL: {cols}</span>
        </div>
      </div>

      {isKeyboardVisible && <VirtualKeyboard onKeyPress={handleVirtualKey} />}
    </div>
  );
};
