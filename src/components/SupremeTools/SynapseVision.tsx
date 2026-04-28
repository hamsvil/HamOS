import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Database, Cpu, Network, BookOpen, Layers, 
  ChevronRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import { ResourceSentinel } from '../../services/supremeTools/ResourceSentinel';
import { NexusTopology } from '../../services/supremeTools/NexusTopology';
import { NeuralAtlas } from '../../services/supremeTools/NeuralAtlas';
import { SovereignBuild } from '../../services/supremeTools/SovereignBuild';
import { GhostDeduplicator } from '../../services/supremeTools/GhostDeduplicator';
import { ResourceMetrics, TopologyNode, AtlasKnowledge } from '../../types/supreme';
import { toast } from 'sonner';

/**
 * PILAR 12: SYNAPSE-VISION (The 4D Observable)
 * Dashboard Mission Control untuk memantau 13 Supreme Tools.
 */
export const SynapseVision: React.FC = () => {
  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null);
  const [nodes, setNodes] = useState<Map<string, TopologyNode>>(new Map());
  const [knowledge, setKnowledge] = useState<AtlasKnowledge[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'topology' | 'atlas'>('metrics');
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);

  const runFullDiagnostic = async () => {
    setIsDiagnosticRunning(true);
    toast.info("Starting Full Supreme Diagnostic Scan...");
    
    try {
      // 1. Ghost Deduplication Audit
      GhostDeduplicator.getInstance().auditGlobals();
      
      // 2. Topology Re-map
      const updatedNodes = await NexusTopology.getInstance().mapProject();
      setNodes(updatedNodes);
      
      // 3. Sovereign Build Simulation
      const buildRes = await SovereignBuild.getInstance().simulateBuild(['/src/App.tsx', '/src/main.tsx']);
      
      if (buildRes.success) {
        toast.success("Diagnostic Complete: System Optimized & Verified.");
      } else {
        toast.error(`Diagnostic Alert: ${buildRes.errors[0]}`);
      }
    } catch (e) {
      toast.error("Diagnostic Failed: Hardware/Logic Intersection Error.");
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  useEffect(() => {
    const sentinel = ResourceSentinel.getInstance();
    const nexus = NexusTopology.getInstance();
    const atlas = NeuralAtlas.getInstance();

    const interval = setInterval(() => {
      setMetrics(sentinel.getMetrics());
    }, 2000);

    nexus.mapProject().then(setNodes);
    atlas.getRecentKnowledge().then(setKnowledge);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* HEADER: Recipe 1 - Professional & Information Dense */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#141414]">
        <div className="flex items-center gap-4">
          <Activity className="w-6 h-6" />
          <h1 className="font-serif italic text-xl uppercase tracking-widest opacity-80">
            Synapse Vision <span className="not-italic opacity-40 text-sm ml-2 font-mono">v13.0.0</span>
          </h1>
        </div>
        <div className="flex gap-4 font-mono text-xs">
          <button 
            onClick={runFullDiagnostic}
            disabled={isDiagnosticRunning}
            className={`px-3 py-1 border border-red-900 bg-red-100 text-red-900 font-bold hover:bg-red-900 hover:text-white transition-all ${isDiagnosticRunning ? 'animate-pulse opacity-50' : ''}`}
          >
            {isDiagnosticRunning ? 'SCANNING...' : 'FORCE_DIAGNOSTIC'}
          </button>
          <div className="w-[1px] bg-[#141414]/20 mx-2" />
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1 border border-[#141414] transition-colors ${activeTab === 'metrics' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'}`}
          >
            01_RES_SENTINEL
          </button>
          <button 
            onClick={() => setActiveTab('topology')}
            className={`px-3 py-1 border border-[#141414] transition-colors ${activeTab === 'topology' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'}`}
          >
            02_NEXUS_GRAPH
          </button>
          <button 
            onClick={() => setActiveTab('atlas')}
            className={`px-3 py-1 border border-[#141414] transition-colors ${activeTab === 'atlas' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414] hover:text-[#E4E3E0]'}`}
          >
            03_NEURAL_ATLAS
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'metrics' && (
            <motion.div 
              key="metrics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <MetricCard 
                label="HEAP_USED" 
                value={`${((metrics?.heapUsed || 0) / (1024 * 1024)).toFixed(2)} MB`} 
                icon={<Database className="w-4 h-4" />}
                trend={metrics?.throttleActive ? 'warning' : 'stable'}
              />
              <MetricCard 
                label="HEAP_LIMIT" 
                value={`${((metrics?.heapTotal || 0) / (1024 * 1024)).toFixed(0)} MB`} 
                icon={<Layers className="w-4 h-4" />}
              />
              <MetricCard 
                label="RAM_PRESSURE" 
                value={`${(metrics?.usagePercentage || 0).toFixed(1)}%`} 
                icon={<Cpu className="w-4 h-4" />}
                trend={metrics?.usagePercentage && metrics.usagePercentage > 80 ? 'critical' : 'stable'}
              />
              <MetricCard 
                label="CPU_LOAD" 
                value={`${(metrics?.cpuLoad || 0).toFixed(1)}%`} 
                icon={<Activity className="w-4 h-4" />}
              />
              
              <div className="col-span-full mt-4 p-4 border border-[#141414] bg-[#141414]/5">
                <h3 className="font-serif italic text-sm opacity-60 mb-4 uppercase tracking-wider underline underline-offset-4">
                  Autonomous Governance Logs
                </h3>
                <div className="font-mono text-[10px] space-y-1">
                  <p className="flex items-center gap-2 opacity-50">
                    <span className="text-[#141414]/30">[20:43:59]</span>
                    <span className="text-green-700">OK</span>
                    GhostDeduplicator synchronized: 0 duplicate instances found.
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-[#141414]/30">[20:44:12]</span>
                    <span className="text-blue-700">INFO</span>
                    ResourceSentinel: Paging active for large transforms (App.tsx).
                  </p>
                  {metrics?.throttleActive && (
                    <p className="flex items-center gap-2 text-red-700 animate-pulse">
                      <span className="text-[#141414]/30">[20:45:01]</span>
                      <span className="font-bold">WARN</span>
                      THROTTLE_ACTIVE: CPU cycles redistributed to critical build path.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'topology' && (
            <motion.div 
              key="topology"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif italic text-lg uppercase">Architectural Graph Topology</h2>
                <div className="font-mono text-[10px] px-2 py-1 bg-[#141414] text-[#E4E3E0]">
                  NODES_MAPPED: {nodes.size}
                </div>
              </div>
              
              <div className="border border-[#141414] divide-y divide-[#141414]">
                {Array.from(nodes.values()).slice(0, 15).map((node) => (
                  <div key={node.id} className="grid grid-cols-[1fr,200px,100px] p-3 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <ChevronRight className="w-3 h-3 opacity-30 group-hover:translate-x-1 transition-transform" />
                      <span className="font-mono text-xs">{node.path}</span>
                    </div>
                    <div className="font-mono text-[10px] opacity-60 flex items-center gap-2">
                      <Network className="w-3 h-3" />
                      IMPORTS: {node.imports.length}
                    </div>
                    <div className="flex items-center justify-end">
                      {node.isCircular ? (
                        <div className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded text-[8px] font-bold animate-pulse">
                          <AlertCircle className="w-2 h-2" /> CIRCULAR_LOOP
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-green-700 opacity-60 text-[8px] font-bold">
                          <CheckCircle2 className="w-2 h-2" /> V_VALID
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'atlas' && (
            <motion.div 
              key="atlas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-1 space-y-6">
                <div className="p-4 border border-[#141414] bg-[#141414]/5 space-y-4">
                  <h3 className="font-serif italic uppercase text-sm border-b border-[#141414] pb-2">Knowledge Capture</h3>
                  <form 
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const targetId = (form.elements.namedItem('targetId') as HTMLInputElement).value;
                      const intent = (form.elements.namedItem('intent') as HTMLTextAreaElement).value;
                      if (targetId && intent) {
                        NeuralAtlas.getInstance().recordKnowledge({
                          targetId,
                          intent,
                          consequences: ['Architectural alignment', 'Logic stabilization'],
                          author: 'architect'
                        }).then(() => {
                          form.reset();
                          NeuralAtlas.getInstance().getRecentKnowledge().then(setKnowledge);
                        });
                      }
                    }}
                  >
                    <div>
                      <label className="font-mono text-[10px] uppercase opacity-50 block mb-1">Target_Id</label>
                      <input name="targetId" className="w-full bg-transparent border border-[#141414] p-2 font-mono text-xs outline-none focus:bg-[#141414] focus:text-[#E4E3E0]" placeholder="/src/App.tsx" required />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] uppercase opacity-50 block mb-1">Architect_Intent</label>
                      <textarea name="intent" className="w-full bg-transparent border border-[#141414] p-2 font-mono text-xs outline-none focus:bg-[#141414] focus:text-[#E4E3E0]" rows={4} placeholder="Decoupling state to reduce memory footprint..." required />
                    </div>
                    <button type="submit" className="w-full bg-[#141414] text-[#E4E3E0] py-2 font-mono text-xs uppercase hover:opacity-90 transition-opacity">
                      COMMIT_KNOWLEDGE
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2">
                <h3 className="font-serif italic text-lg mb-4 uppercase">Persistent Logic Store</h3>
                <div className="space-y-4">
                  {knowledge.map((item) => (
                    <div key={item.id} className="p-4 border border-[#141414] hover:shadow-[4px_4px_0px_#141414] transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] bg-[#141414] text-[#E4E3E0] px-2 py-0.5">{item.author.toUpperCase()}</span>
                        <span className="font-mono text-[10px] opacity-40">{new Date(item.timestamp).toISOString()}</span>
                      </div>
                      <h4 className="font-mono text-xs font-bold mb-1">{item.targetId}</h4>
                      <p className="font-serif text-sm italic opacity-80 leading-relaxed">{item.intent}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.consequences.map((c, i) => (
                          <span key={i} className="font-mono text-[9px] border border-[#141414]/20 px-2 py-0.5 opacity-60">
                            + {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {knowledge.length === 0 && (
                    <div className="p-12 border border-[#141414] border-dashed flex flex-col items-center justify-center opacity-30">
                      <BookOpen className="w-8 h-8 mb-2" />
                      <span className="font-mono text-[10px]">NO_KNOWLEDGE_ENTRIES_FOUND</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; icon: React.ReactNode; trend?: 'stable' | 'warning' | 'critical' }> = ({ label, value, icon, trend }) => {
  const trendColor = trend === 'critical' ? 'text-red-700' : trend === 'warning' ? 'text-orange-700' : 'text-green-700';

  return (
    <div className="border border-[#141414] p-4 group hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors">
      <div className="flex items-center gap-2 mb-2 opacity-50 group-hover:opacity-100">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-widest italic font-bold">{label}</span>
      </div>
      <div className={`font-mono text-2xl font-light ${trendColor} group-hover:text-inherit`}>
        {value}
      </div>
    </div>
  );
};
