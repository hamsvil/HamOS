 
import React, { useState, useEffect } from 'react';
import { Package, Download, Trash2, Search, X, Loader2, CheckCircle } from 'lucide-react';
import { marketplaceService, Extension } from '../../../services/marketplaceService';
import { motion, AnimatePresence } from 'framer-motion';

interface MarketplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MarketplacePanel({ isOpen, onClose }: MarketplacePanelProps) {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadExtensions();
    }
  }, [isOpen]);

  const loadExtensions = async () => {
    setLoading(true);
    const available = await marketplaceService.getAvailableExtensions();
    setExtensions(available);
    setLoading(false);
  };

  const handleInstall = async (id: string) => {
    setInstalling(id);
    await marketplaceService.installExtension(id);
    await loadExtensions();
    setInstalling(null);
  };

  const handleUninstall = async (id: string) => {
    await marketplaceService.uninstallExtension(id);
    await loadExtensions();
  };

  const filteredExtensions = extensions.filter(ext => 
    ext.name.toLowerCase().includes(search.toLowerCase()) || 
    ext.description.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#141414] border border-white/10 rounded-2xl flex flex-col w-full max-w-4xl h-[80vh] shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-xl">
              <Package size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Extension Marketplace</h2>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Enhance your Ham AiStudio experience</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-[#1a1a1a]/50 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="Search extensions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-sm text-gray-500 font-mono">Fetching extensions from registry...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExtensions.map(ext => (
                <div key={ext.id} className="bg-[#141414] border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {ext.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{ext.name}</h3>
                        <p className="text-[10px] text-gray-500 font-mono">v{ext.version} by {ext.author}</p>
                      </div>
                    </div>
                    {ext.installed ? (
                      <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-full">
                        <CheckCircle size={10} />
                        Installed
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">{ext.description}</p>
                  <div className="flex items-center justify-end gap-2">
                    {ext.installed ? (
                      <button 
                        onClick={() => handleUninstall(ext.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        <Trash2 size={12} />
                        Uninstall
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleInstall(ext.id)}
                        disabled={installing === ext.id}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {installing === ext.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        {installing === ext.id ? 'Installing...' : 'Install'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
