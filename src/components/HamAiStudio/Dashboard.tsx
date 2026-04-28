 
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  FileCode, 
  Clock, 
  Zap, 
  Database, 
  Layout, 
  Shield, 
  Cpu, 
  History,
  Code2,
  Sparkles,
  CheckCircle2,
  Rocket,
  Smartphone,
  Globe,
  Settings,
  X
} from 'lucide-react';
import { ProjectData, AgentActivity } from './types';

interface DashboardProps {
  project: ProjectData | null;
  onSelectFile: (path: string) => void;
  onStartChat: (prompt?: string, projectType?: string, engine?: string) => void;
  onDeploy: () => void;
  isLoading: boolean;
  agentActivities: AgentActivity[];
  onOpenManualInstruction?: () => void;
}

export default function Dashboard({ project, onSelectFile, onStartChat, onDeploy, isLoading, agentActivities, onOpenManualInstruction }: DashboardProps) {
  const [neuralLoad, setNeuralLoad] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState('0 MB');
  const [showStartForm, setShowStartForm] = useState(false);
  const [selectedType, setSelectedType] = useState<'web' | 'native'>('web');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('hamEngine');

  const fileCount = project?.files ? project.files.length : 0;
  const recentFiles = React.useMemo(() => (project?.files && Array.isArray(project.files)) ? project.files.slice(-5).reverse() : [], [project]);
  
  const projectSize = React.useMemo(() => (project?.files && Array.isArray(project.files)) 
    ? project.files.reduce((acc, file) => acc + (file.content?.length || 0), 0) 
    : 0, [project]);

  const formattedSize = React.useMemo(() => projectSize > 1024 
    ? `${(projectSize / 1024).toFixed(1)} KB` 
    : `${projectSize} B`, [projectSize]);

  const loc = React.useMemo(() => (project?.files && Array.isArray(project.files)) ? project.files.reduce((acc, file) => acc + (file.content?.split('\n').length || 0), 0) : 0, [project]);
  const depCount = React.useMemo(() => project && project.dependencies ? Object.keys(project.dependencies).length : 0, [project]);

  const agentActivitiesRef = React.useRef(agentActivities);
  useEffect(() => { agentActivitiesRef.current = agentActivities; }, [agentActivities]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const updateStats = () => {
      if ((performance as any).memory) {
        const usedJSHeapSize = (performance as any).memory.usedJSHeapSize;
        setMemoryUsage(`${(usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`);
      } else {
          setMemoryUsage(`${(projectSize / 1024 / 1024 * 2 + 50).toFixed(1)} MB`);
      }

      if (isLoading) {
        const currentActivities = agentActivitiesRef.current;
        const activeAgents = currentActivities.filter(a => (a.progress || 0) < 100).length;
        const totalProgress = currentActivities.reduce((acc, curr) => acc + (curr.progress || 0), 0);
        const avgProgress = currentActivities.length > 0 ? totalProgress / currentActivities.length : 0;
        
        let load = 30 + (activeAgents * 20); 
        if (avgProgress > 10 && avgProgress < 90) load += 20;
        
        setNeuralLoad(Math.min(100, load));
      } else {
        const baseLoad = Math.min(20, Math.max(2, fileCount * 0.5));
        const fluctuation = Math.random() * 5;
        setNeuralLoad(baseLoad + fluctuation);
      }
    };

    updateStats(); // Initial update

    if (isLoading) {
      interval = setInterval(updateStats, 1000); // Throttle updates during loading
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [project, fileCount, projectSize, isLoading]);

  const stats = [
    { label: 'Total Files', value: fileCount, icon: FileCode, color: 'text-blue-400' },
    { label: 'Lines of Code', value: loc.toLocaleString(), icon: Code2, color: 'text-cyan-400' },
    { label: 'Dependencies', value: depCount, icon: Database, color: 'text-yellow-400' },
    { label: 'Project Size', value: formattedSize, icon: Shield, color: 'text-purple-400' },
  ];

  const handleBuild = () => {
    if (!projectDescription.trim()) return;
    onStartChat(projectDescription, selectedType, selectedEngine);
    setShowStartForm(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[var(--bg-primary)] custom-scrollbar relative">
      <AnimatePresence>
        {showStartForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="text-[#00ffcc]" size={20} />
                  Start AI Session
                </h2>
                <button onClick={() => setShowStartForm(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Project Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSelectedType('web')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedType === 'web' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]'}`}
                  >
                    <Globe size={24} />
                    <span className="font-bold">Web App</span>
                  </button>
                  <button 
                    onClick={() => setSelectedType('native')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedType === 'native' ? 'bg-[#00ffcc]/10 border-[#00ffcc] text-[#00ffcc]' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]'}`}
                  >
                    <Smartphone size={24} />
                    <span className="font-bold">Native APK</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Project Description</label>
                <textarea 
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe the project you want to build in detail..."
                  className="w-full h-32 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[#00ffcc] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={onOpenManualInstruction}
                    className="p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:text-[#00ffcc] hover:border-[#00ffcc] transition-all"
                    title="Manual Instructions (Core Memory)"
                  >
                    <Settings size={20} />
                  </button>
                  <select 
                    value={selectedEngine}
                    onChange={(e) => setSelectedEngine(e.target.value)}
                    className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[#00ffcc]"
                  >
                    <option value="hamEngine">HamEngine (Default)</option>
                    <option value="openRouter">OpenRouter Swarm</option>
                  </select>
                </div>
                <button 
                  onClick={handleBuild}
                  disabled={!projectDescription.trim()}
                  className="px-6 py-2.5 bg-[#00ffcc] text-black font-bold rounded-xl hover:bg-[#00ffcc]/80 transition-all shadow-[0_0_20px_rgba(0,255,204,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Rocket size={18} />
                  Build
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="col-span-2">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
              <Sparkles className="text-[#00ffcc]" />
              Project Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">Overview of your current development workspace.</p>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <button 
              onClick={onDeploy}
              disabled={!project}
              className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Rocket size={18} />
              Deploy
            </button>
            <button 
              onClick={() => setShowStartForm(true)}
              className="w-full py-2.5 bg-[#00ffcc] text-black font-bold rounded-xl hover:bg-[#00ffcc]/80 transition-all shadow-[0_0_20px_rgba(0,255,204,0.3)] flex items-center justify-center gap-2"
            >
              <Code2 size={18} />
              Start AI Session
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-5 rounded-2xl backdrop-blur-sm hover:border-[var(--text-secondary)] transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`${stat.color} group-hover:scale-110 transition-transform`} size={20} />
                <Activity size={14} className="text-[var(--text-secondary)]/20" />
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
              <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-medium mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Files */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-secondary)]/40 uppercase tracking-widest flex items-center gap-2">
              <History size={16} />
              Recent Files
            </h3>
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl overflow-hidden backdrop-blur-sm">
              {recentFiles.length > 0 ? (
                <div className="divide-y divide-[var(--border-color)]">
                  {recentFiles.map((file, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectFile(file.path)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)] transition-all group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                          <FileCode size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[#00ffcc] transition-colors">{file.path.split('/').pop()}</div>
                          <div className="text-xs text-[var(--text-secondary)] font-mono">{file.path}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileCode size={48} className="mx-auto text-[var(--text-secondary)]/10 mb-4" />
                  <p className="text-[var(--text-secondary)] text-sm italic">No files generated yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* System Status & Quick Actions */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-secondary)]/40 uppercase tracking-widest flex items-center gap-2">
                <Cpu size={16} />
                Quantum Engine
              </h3>
              <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl p-5 backdrop-blur-sm space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Neural Load</span>
                    <span className="text-[#00ffcc]">{Math.round(neuralLoad)}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${neuralLoad}%` }}
                      className="h-full bg-[#00ffcc]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Memory Usage</span>
                    <span className="text-blue-400">{memoryUsage}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '40%' }} // Keep visual bar static or relative to a max
                      className="h-full bg-blue-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-secondary)]/40 uppercase tracking-widest flex items-center gap-2">
                <Zap size={16} />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-secondary)] transition-all text-center group">
                  <Database size={20} className="mx-auto mb-2 text-orange-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Schema</span>
                </button>
                <button className="p-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-secondary)] transition-all text-center group">
                  <Layout size={20} className="mx-auto mb-2 text-pink-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Layout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
