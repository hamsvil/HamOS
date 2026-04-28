 
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image as ImageIcon, Shield } from 'lucide-react';

interface GlobalDropzoneProps {
  onFilesDropped: (files: File[]) => void;
}

export const GlobalDropzone: React.FC<GlobalDropzoneProps> = ({ onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only set to false if we're leaving the window
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        onFilesDropped(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFilesDropped]);

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-blue-600/20 backdrop-blur-xl border-4 border-dashed border-blue-500/50 m-4 rounded-3xl pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="flex flex-col items-center text-center max-w-md"
          >
            <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/50">
              <Upload size={48} className="text-white animate-bounce" />
            </div>
            
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
              DROP TO ANALYZE
            </h2>
            
            <p className="text-blue-100/80 text-lg mb-8 leading-relaxed">
              Release your files to initiate <span className="text-white font-bold">Massive Token Synthesis</span> and vector indexing.
            </p>

            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm">
                <FileText size={16} />
                <span>PDF/DOCX/XLSX</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm">
                <ImageIcon size={16} />
                <span>Images</span>
              </div>
            </div>

            <div className="mt-12 flex items-center gap-2 text-blue-300/60 text-xs font-bold uppercase tracking-widest">
              <Shield size={14} />
              <span>Secure Local Processing Active</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
