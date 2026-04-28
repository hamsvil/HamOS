 
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle, X, Zap, Trash2, Clock, Info } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { BgTaskState } from '../types/tasks';
import { Database, Server } from 'lucide-react';

export default function TasksTab() {
  const { tasks, removeTask, clearCompleted, init, initialized, bgInit } = useTaskStore();

  useEffect(() => {
    if (!initialized) init();
  }, [initialized, init]);

  const activeTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'error');

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-8 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <Zap size={24} className="text-violet-400 animate-pulse" />
              </div>
              <h1 className="text-4xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Neural Task Manager</h1>
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-medium opacity-60 uppercase tracking-widest">
              Monitoring system operations and background processes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => clearCompleted()}
              disabled={completedTasks.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
            >
              <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Clear History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Background Tasks Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h2 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">System Background Tasks</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BgTaskCard 
                name="Vector Store Sync" 
                status={bgInit.vectorStore} 
                icon={<Database size={20} className="text-blue-400" />} 
                description="Synchronizing knowledge base with VFS"
              />
              <BgTaskCard 
                name="WebContainer Runtime" 
                status={bgInit.webContainer} 
                icon={<Server size={20} className="text-purple-400" />} 
                description="Initializing browser-side Node.js environment"
              />
            </div>
          </section>

          {/* Active Tasks Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                <h2 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">Active Operations</h2>
              </div>
              <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 px-2 py-1 rounded-md border border-violet-500/20">
                {activeTasks.length} RUNNING
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {activeTasks.map(task => (
                  <TaskCard key={task.id} task={task} onRemove={() => removeTask(task.id)} />
                ))}
              </AnimatePresence>
              {activeTasks.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center gap-4 border-2 border-dashed border-[var(--border-color)] rounded-[2rem] opacity-30">
                  <Clock size={48} strokeWidth={1} />
                  <p className="text-xs font-black uppercase tracking-widest">No active operations detected</p>
                </div>
              )}
            </div>
          </section>

          {/* Completed Tasks Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">Recent History</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                {completedTasks.length} COMPLETED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {completedTasks.map(task => (
                  <TaskCard key={task.id} task={task} onRemove={() => removeTask(task.id)} />
                ))}
              </AnimatePresence>
              {completedTasks.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center gap-4 border-2 border-dashed border-[var(--border-color)] rounded-[2rem] opacity-30">
                  <Info size={48} strokeWidth={1} />
                  <p className="text-xs font-black uppercase tracking-widest">History is empty</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function BgTaskCard({ name, status, icon, description }: { name: string, status: BgTaskState, icon: React.ReactNode, description: string }) {
  const renderStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 size={20} className="animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle size={20} className="text-emerald-400" />;
      case 'error':
        return <AlertCircle size={20} className="text-rose-400" />;
      default:
        return <Clock size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 rounded-3xl shadow-xl flex flex-col gap-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${
        status === 'error' ? 'bg-rose-500' : status === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
      } opacity-50`} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-2xl shrink-0 ${
            status === 'error' ? 'bg-rose-500/10' : status === 'success' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
          }`}>
            {renderStatusIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight truncate">
              {name}
            </h3>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-40 uppercase tracking-widest">
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">Status</span>
        <span className={`uppercase ${
          status === 'error' ? 'text-rose-400' : status === 'success' ? 'text-emerald-400' : 'text-blue-400'
        }`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function TaskCard({ task, onRemove }: { task: any, onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 rounded-3xl shadow-xl flex flex-col gap-4 group relative overflow-hidden"
    >
      {/* Status Glow */}
      <div className={`absolute top-0 left-0 w-full h-1 ${
        task.status === 'error' ? 'bg-rose-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-500'
      } opacity-50`} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-2xl shrink-0 ${
            task.status === 'error' ? 'bg-rose-500/10 text-rose-400' : task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'
          }`}>
            {task.status === 'running' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : task.status === 'completed' ? (
              <CheckCircle size={20} />
            ) : task.status === 'error' ? (
              <AlertCircle size={20} />
            ) : (
              <Clock size={20} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight truncate">
              {task.name}
            </h3>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-40 uppercase tracking-widest">
              {task.type} • {new Date(task.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button 
          onClick={onRemove}
          className="p-2 hover:bg-white/10 rounded-xl text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">Progress</span>
          <span className={task.status === 'error' ? 'text-rose-400' : 'text-violet-400'}>
            {Math.round(task.progress)}%
          </span>
        </div>
        <div className="h-2 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${task.progress}%` }}
            className={`h-full transition-all duration-500 ${
              task.status === 'error' ? 'bg-rose-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-500'
            }`}
          />
        </div>
      </div>

      {task.error && (
        <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
          <p className="text-[9px] text-rose-400 font-bold uppercase tracking-wider leading-relaxed">
            {task.error}
          </p>
        </div>
      )}
    </motion.div>
  );
}
