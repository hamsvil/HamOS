 
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useLiveQuery } from 'dexie-react-hooks';
import { structuredDb, MemoryEntry } from '../db/structuredDb';
import { hamliMemoryService, HamliMemory } from '../services/hamliMemoryService';
import { Database, Brain, Plus, RefreshCw, Server, Zap, ShieldCheck, Trash2, Search, Filter, Download, ChevronDown, ChevronUp, FileJson, Activity } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useSupremeProtocol } from '../hooks/useSupremeProtocol';
import { hamEventBus } from '../ham-synapse/core/event_bus';
import { HamEventType } from '../ham-synapse/core/types';

export default function HamliMemoryTab() {
  useSupremeProtocol();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState('interaction');
  const [memoryCategory, setMemoryCategory] = useState<'dynamic' | 'static'>('dynamic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  
  // New States for Enhanced UI
  const [activeTab, setActiveTab] = useState<'all' | 'static' | 'dynamic'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [limit, setLimit] = useState(50);

  // Reactive Database Query
  const memories = useLiveQuery(async () => {
    if (searchQuery.trim()) {
      const results = await hamliMemoryService.searchMemory(searchQuery, activeTab);
      return results.map(r => ({
        ...r,
        category: r.id.startsWith('stat') ? 'static' as const : 'dynamic' as const
      }));
    }

    let entries: (MemoryEntry & { category: 'static' | 'dynamic' })[] = [];
    
    if (activeTab === 'all' || activeTab === 'static') {
      const staticData = await structuredDb.staticMemory
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
      entries = [...entries, ...staticData.map(m => ({ ...m, category: 'static' as const }))];
    }
    
    if (activeTab === 'all' || activeTab === 'dynamic') {
      const dynamicData = await structuredDb.dynamicMemory
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
      entries = [...entries, ...dynamicData.map(m => ({ ...m, category: 'dynamic' as const }))];
    }

    return entries.sort((a, b) => {
      return sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });
  }, [activeTab, searchQuery, limit, sortOrder]);

  const stats = useLiveQuery(async () => {
    const staticCount = await structuredDb.staticMemory.count();
    const dynamicCount = await structuredDb.dynamicMemory.count();
    return { staticCount, dynamicCount };
  }, []);

  useEffect(() => {
    const unsubscribe = hamEventBus.subscribe(HamEventType.SYNC_COMPLETE, () => {
      setSyncStatus('idle');
    });
    return unsubscribe;
  }, []);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;

    setIsSubmitting(true);
    try {
      if (memoryCategory === 'dynamic') {
        await hamliMemoryService.addDynamicMemory(newMemoryContent, newMemoryType);
      } else {
        await hamliMemoryService.addStaticMemory(newMemoryContent, newMemoryType);
      }
      setNewMemoryContent('');
      showToast('Memori berhasil disimpan.', 'success');
      // Switch to the tab where memory was added to show it immediately
      setActiveTab(memoryCategory === 'dynamic' ? 'dynamic' : 'static');
    } catch (error) {
      console.error('Failed to add memory:', error);
      showToast('Gagal menyimpan memori. Silakan coba lagi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncMemory = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      // Logic for sync would go here, for now we just simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSyncStatus('success');
      hamEventBus.dispatch({
        id: `sync_complete_${Date.now()}`,
        type: HamEventType.SYNC_COMPLETE,
        timestamp: Date.now(),
        source: 'HAMLI_MEMORY_TAB',
        payload: null
      });
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('idle');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteMemory = async (category: 'static' | 'dynamic', id: string) => {
    if (!await confirm('Are you sure you want to delete this memory entry?')) return;
    try {
      await hamliMemoryService.deleteMemory(category, id);
      showToast('Memori dihapus.', 'success');
    } catch (error) {
      console.error('Failed to delete memory:', error);
      showToast('Gagal menghapus memori.', 'error');
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const handleExportMemory = async () => {
    try {
      const staticData = await structuredDb.staticMemory.toArray();
      const dynamicData = await structuredDb.dynamicMemory.toArray();
      const fullMemory = { static: staticData, dynamic: dynamicData };
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullMemory, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "hamli_memory_dump.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error('Export failed:', e);
      showToast('Gagal mengekspor memori.', 'error');
    }
  };

  const loadMore = useCallback(() => {
    if (!searchQuery) {
      setLimit(prev => prev + 50);
    }
  }, [searchQuery]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-gray-100 p-2 md:p-3 overflow-hidden font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 shrink-0">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tighter">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Brain className="w-5 h-5 text-emerald-400" />
            </div>
            HAMLI MEMORY CORE v7
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-wider ml-1">Neural Synapse & Long-Term Knowledge Repository (Singularity Engine v7)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMemory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-gray-800/50 text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all"
            title="Export Memory to JSON"
          >
            <FileJson className="w-3 h-3" />
            EXPORT
          </button>
          <button
            onClick={handleSyncMemory}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
              syncStatus === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' 
                : 'bg-gray-800/50 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
            }`}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : syncStatus === 'success' ? (
              <ShieldCheck className="w-3 h-3" />
            ) : (
              <Activity className="w-3 h-3 text-violet-400 animate-pulse" />
            )}
            {syncStatus === 'syncing' ? 'SYNCING...' : syncStatus === 'success' ? 'SYNCED' : 'SYNC TO QUANTUM CORE'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-4 flex flex-col gap-3 overflow-hidden">
          {/* Inject Memory Form */}
          <div className="bg-gray-800/20 rounded-xl border border-gray-700/50 p-3 flex flex-col overflow-hidden shadow-lg flex-1">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="p-1 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Injeksi Memori Baru</h3>
            </div>

            <form onSubmit={handleAddMemory} className="flex flex-col flex-1 min-h-0 gap-3">
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Kategori</label>
                    <div className="flex p-0.5 rounded-lg bg-gray-900/80 border border-gray-700/50">
                      <button
                        type="button"
                        onClick={() => setMemoryCategory('dynamic')}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-md transition-all ${
                          memoryCategory === 'dynamic' 
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        Dynamic
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemoryCategory('static')}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-md transition-all ${
                          memoryCategory === 'static' 
                            ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        Static
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Tag / Tipe</label>
                    <input
                      type="text"
                      value={newMemoryType}
                      onChange={(e) => setNewMemoryType(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-[10px] text-gray-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono h-[34px]"
                      placeholder="e.g., interaction"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[100px]">
                  <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Konten</label>
                  <textarea
                    value={newMemoryContent}
                    onChange={(e) => setNewMemoryContent(e.target.value)}
                    className="w-full flex-1 bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2 text-[11px] text-gray-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none custom-scrollbar font-medium leading-relaxed"
                    placeholder="Masukkan data memori..."
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newMemoryContent.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest py-2.5 px-4 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5" />
                )}
                Simpan ke Core
              </button>
            </form>
          </div>
          
          {/* Stats Card */}
          <div className="bg-gray-800/20 rounded-xl border border-gray-700/50 p-3 shadow-lg shrink-0">
             <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-purple-400" />
                Core Statistics
             </h3>
             <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700/30 flex items-center justify-between">
                   <div className="text-[9px] text-gray-500 uppercase font-bold">Static Nodes</div>
                   <div className="text-lg font-black text-cyan-400">{stats?.staticCount || 0}</div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700/30 flex items-center justify-between">
                   <div className="text-[9px] text-gray-500 uppercase font-bold">Dynamic Nodes</div>
                   <div className="text-lg font-black text-emerald-400">{stats?.dynamicCount || 0}</div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Memory List (Enhanced) */}
        <div className="lg:col-span-8 bg-gray-800/20 rounded-xl border border-gray-700/50 flex flex-col overflow-hidden shadow-lg">
          {/* Toolbar */}
          <div className="p-2 border-b border-gray-700/50 bg-gray-800/40 flex flex-col sm:flex-row gap-2 justify-between items-center shrink-0">
             {/* Tabs */}
             <div className="flex p-0.5 bg-gray-900/80 rounded-lg border border-gray-700/50 w-full sm:w-auto">
                {(['all', 'static', 'dynamic'] as const).map((tab) => (
                   <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setLimit(50);
                      }}
                      className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                         activeTab === tab 
                         ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' 
                         : 'text-gray-500 hover:text-gray-300'
                      }`}
                   >
                      {tab}
                   </button>
                ))}
             </div>

             {/* Search & Sort */}
             <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                   <input 
                      type="text" 
                      placeholder="Search memory..." 
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setLimit(50);
                      }}
                      className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg pl-8 pr-2 py-1 text-[10px] text-gray-200 focus:outline-none focus:border-blue-500/50 transition-all h-[28px]"
                   />
                </div>
                <button 
                   onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                   className="p-1.5 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-500 hover:text-white transition-all h-[28px] w-[28px] flex items-center justify-center"
                   title={`Sort by ${sortOrder === 'newest' ? 'Oldest' : 'Newest'}`}
                >
                   <Filter className={`w-3 h-3 ${sortOrder === 'newest' ? 'rotate-0' : 'rotate-180'} transition-transform`} />
                </button>
             </div>
          </div>

          {/* List Content */}
          <div className="flex-1 min-h-0 bg-black/20">
             {!memories ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 py-8">
                   <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Accessing Neural Core...</p>
                </div>
             ) : memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 py-8">
                   <Database size={24} className="opacity-20 mb-2" />
                   <p className="text-[10px] italic">No memory entries found.</p>
                </div>
             ) : (
                <Virtuoso
                  data={memories}
                  endReached={loadMore}
                  className="custom-scrollbar"
                  itemContent={(index, entry) => (
                    <div className="p-2">
                      <div 
                         className={`bg-gray-800/40 rounded-lg border transition-all duration-200 group ${
                            entry.category === 'static' ? 'border-cyan-500/10 hover:border-cyan-500/30' : 'border-emerald-500/10 hover:border-emerald-500/30'
                         }`}
                      >
                         <div className="p-2.5">
                            <div className="flex justify-between items-start mb-1.5">
                               <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
                                     entry.category === 'static' 
                                     ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                                     : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  }`}>
                                     {entry.category}
                                  </span>
                                  <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-gray-700/30 text-gray-400 border border-gray-600/30">
                                     {entry.type}
                                  </span>
                               </div>
                               <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-gray-600 font-mono">
                                     {new Date(entry.timestamp).toLocaleString('id-ID', { 
                                       year: '2-digit', month: 'numeric', day: 'numeric', 
                                       hour: '2-digit', minute: '2-digit' 
                                     })}
                                  </span>
                                  <button 
                                     onClick={() => handleDeleteMemory(entry.category, entry.id)}
                                     className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                     title="Delete Memory"
                                  >
                                     <Trash2 size={11} />
                                  </button>
                               </div>
                            </div>
                            
                            <div className="relative">
                               <p className={`text-gray-300 text-[11px] leading-relaxed whitespace-pre-wrap break-words font-medium ${
                                  !expandedEntries.has(entry.id) ? 'line-clamp-2' : ''
                               }`}>
                                  {entry.content}
                                </p>
                                {entry.content.length > 100 && (
                                   <button 
                                      onClick={() => toggleExpand(entry.id)}
                                      className="mt-1 text-[9px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                                   >
                                      {expandedEntries.has(entry.id) ? (
                                         <>Show Less <ChevronUp size={9} /></>
                                      ) : (
                                         <>Show More <ChevronDown size={9} /></>
                                      )}
                                   </button>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                />
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
