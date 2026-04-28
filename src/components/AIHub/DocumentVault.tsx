 
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, Search, Filter, Clock, Database, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { vectorStore } from '../../services/vectorStore';
import { useToast } from '../../context/ToastContext';

interface Document {
  path: string;
  metadata: any;
  timestamp: number;
}

interface DocumentVaultProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({ isOpen, onClose }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await vectorStore.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      showToast('Gagal memuat daftar dokumen', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const handleDelete = async (path: string) => {
    try {
      await vectorStore.removeDocument(path);
      setDocuments(prev => prev.filter(d => d.path !== path));
      showToast('Dokumen berhasil dihapus dari index', 'success');
    } catch (_error) {
      showToast('Gagal menghapus dokumen', 'error');
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl max-h-[80vh] bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Document Vault</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Local Vector Index v1.0</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={loadDocuments}
                  className="p-2 hover:bg-white/5 rounded-full text-white/60 transition-colors"
                  title="Refresh Index"
                >
                  <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full text-white/60 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="p-4 border-b border-white/5 bg-zinc-900/30 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <input 
                  type="text"
                  placeholder="Search indexed documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <ShieldCheck size={14} />
                <span>{documents.length} Documents Indexed Locally</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {filteredDocs.map((doc) => (
                    <motion.div
                      layout
                      key={doc.path}
                      className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white/40 group-hover:text-blue-400 transition-colors">
                        <FileText size={20} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{doc.path}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-[10px] text-white/40">
                            <Clock size={10} />
                            <span>{new Date(doc.timestamp).toLocaleString()}</span>
                          </div>
                          {doc.metadata?.size && (
                            <div className="text-[10px] text-white/40">
                              {formatSize(doc.metadata.size)}
                            </div>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDelete(doc.path)}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-lg transition-all"
                        title="Remove from Index"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                  <Database size={48} className="mb-4" />
                  <p className="text-sm">No documents found in the local index.</p>
                  <p className="text-xs mt-1">Upload files to start indexing.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-950/50 border-t border-white/5 flex items-center justify-between">
              <div className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                Zero-Cost Edge Intelligence
              </div>
              <div className="text-[10px] text-white/40">
                Data is stored securely in your browser's OPFS SQLite database.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
