 
import React, { useState, useEffect } from 'react';
import { Folder, X, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DirectoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  apiCall: any;
  title?: string;
}

export const DirectoryPickerModal: React.FC<DirectoryPickerModalProps> = ({ isOpen, onClose, onSelect, apiCall, title = 'Select Destination' }) => {
  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFolders(currentPath);
    }
  }, [isOpen, currentPath]);

  const loadFolders = async (path: string) => {
    setLoading(true);
    try {
      const data = await apiCall('list', { dirPath: path });
      setFolders((data.items || []).filter((item: any) => item.isDirectory));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" 
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-3xl shadow-2xl w-full max-w-md flex flex-col gap-4" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-[var(--text-primary)]">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
                <X size={20} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 text-sm text-[var(--text-secondary)]">
              <button onClick={() => setCurrentPath('')} className="hover:text-violet-400 transition-colors whitespace-nowrap">Home</button>
              {pathParts.map((part, index) => {
                const path = pathParts.slice(0, index + 1).join('/');
                return (
                  <React.Fragment key={path}>
                    <ChevronRight size={14} className="opacity-50 flex-shrink-0" />
                    <button onClick={() => setCurrentPath(path)} className="hover:text-violet-400 transition-colors whitespace-nowrap truncate max-w-[100px]">
                      {part}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Folder List */}
            <div className="border border-[var(--border-color)] bg-[var(--bg-tertiary)] h-64 overflow-y-auto rounded-2xl p-2 space-y-1">
              {loading ? (
                <div className="flex justify-center items-center h-full text-[var(--text-secondary)] text-sm">Loading...</div>
              ) : folders.length === 0 ? (
                <div className="flex justify-center items-center h-full text-[var(--text-secondary)] text-sm">No folders here</div>
              ) : (
                folders.map(folder => (
                  <button
                    key={folder.path}
                    onClick={() => setCurrentPath(folder.path)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-[var(--bg-secondary)] rounded-xl transition-colors text-left"
                  >
                    <Folder size={16} className="text-blue-400" />
                    <span className="text-sm truncate flex-1 text-[var(--text-primary)]">{folder.name}</span>
                    <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-50" />
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Cancel
              </button>
              <button 
                onClick={() => { onSelect(currentPath); onClose(); }}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
              >
                <Check size={16} /> Select Current Folder
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
