 
import React from 'react';
import { Loader2, CheckCircle2, XCircle, Database, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type BgTaskState = 'idle' | 'loading' | 'success' | 'error';

export interface BgInitStatus {
  vectorStore: BgTaskState;
  webContainer: BgTaskState;
}

interface BackgroundInitBadgeProps {
  status: BgInitStatus;
}

export const BackgroundInitBadge: React.FC<BackgroundInitBadgeProps> = ({ status }) => {
  const isAllSuccess = status.vectorStore === 'success' && status.webContainer === 'success';
  const isAnyError = status.vectorStore === 'error' || status.webContainer === 'error';
  const isAnyLoading = status.vectorStore === 'loading' || status.webContainer === 'loading';

  if (isAllSuccess || (!isAnyLoading && !isAnyError)) {
    return null;
  }

  const renderIcon = (state: BgTaskState) => {
    switch (state) {
      case 'loading':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-500" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-2xl"
      >
        <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">
          Background Tasks
        </div>
        
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-white/90">
            <Database className="w-4 h-4 text-blue-400" />
            <span>Vector Store</span>
          </div>
          {renderIcon(status.vectorStore)}
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-white/90">
            <Server className="w-4 h-4 text-purple-400" />
            <span>WebContainer</span>
          </div>
          {renderIcon(status.webContainer)}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
