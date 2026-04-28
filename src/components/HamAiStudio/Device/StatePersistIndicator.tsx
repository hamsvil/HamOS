import React from 'react';
import { useGlobalState } from '../../../hooks/useGlobalState';
import { useContext } from 'react';
import { GlobalStateContext } from '../../../contexts/GlobalStateContext';
import { motion, AnimatePresence } from 'framer-motion';

const StatePersistIndicator: React.FC = () => {
  const context = useContext(GlobalStateContext);
  
  if (!context) return null;

  const { saveStatus, lastSaved } = context;

  const getStatusColor = () => {
    switch (saveStatus) {
      case 'saved': return 'bg-green-500';
      case 'saving': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saved': return 'Auto-saved';
      case 'saving': return 'Saving...';
      case 'error': return 'Sync Error';
      default: return '';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg pointer-events-none select-none">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <div className="flex flex-col">
        <span className="text-[10px] font-medium text-white/90 leading-none">
          {getStatusText()}
        </span>
        {lastSaved && saveStatus === 'saved' && (
          <span className="text-[8px] text-white/40 leading-none mt-0.5">
            {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatePersistIndicator;
