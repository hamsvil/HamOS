import React from 'react';
import { Download, FileArchive, Trash2, X, CheckCircle, Move, Copy, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkActionToolbarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onZip: () => void;
  onDownload: () => void;
  onMove: () => void;
  onCopy: () => void;
  onOpenApkBuilder?: () => void;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({ count, onClear, onDelete, onZip, onDownload, onMove, onCopy, onOpenApkBuilder }) => {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 px-8 py-4 bg-violet-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(139,92,246,0.4)] border border-violet-400/30 backdrop-blur-2xl"
        >
          <div className="flex items-center gap-4 border-r border-violet-400/30 pr-6">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <CheckCircle size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-white uppercase tracking-tighter">{count} Objects Selected</span>
              <span className="text-[8px] font-black text-violet-200 uppercase tracking-widest opacity-70">Neural Batch Active</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Download size={16} /> Download
            </button>
            <button 
              onClick={onMove}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Move size={16} /> Move
            </button>
            <button 
              onClick={onCopy}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Copy size={16} /> Copy
            </button>
            <button 
              onClick={onZip}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <FileArchive size={16} /> Compress
            </button>
            <button 
              onClick={onOpenApkBuilder}
              className="flex items-center gap-2 px-4 py-2 hover:bg-green-500/20 hover:text-green-200 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              title="Build APK"
            >
              <Smartphone size={16} /> Build APK
            </button>
            <button 
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 hover:text-red-200 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>

          <div className="w-px h-6 bg-violet-400/30 mx-2" />

          <button 
            onClick={onClear}
            className="p-2 hover:bg-white/10 rounded-xl text-white transition-all active:scale-90"
            title="Clear Selection"
          >
            <X size={20} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
