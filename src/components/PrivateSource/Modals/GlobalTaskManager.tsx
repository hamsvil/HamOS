 
// [STABILITY] Promise chains verified
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Loader2, CheckCircle, AlertCircle, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../services/db';
import { TaskProgress, TaskType } from '../../../types/tasks';

export type Task = TaskProgress;

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'progress' | 'status' | 'createdAt'>) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    db.tasks.toArray().then(setTasks).catch(console.error);
  }, []);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'progress' | 'status' | 'createdAt'>) => {
    const id = Math.random().toString(36).substring(7);
    const newTask: Task = { ...task, id, progress: 0, status: 'pending', createdAt: Date.now() };
    await db.tasks.add(newTask);
    setTasks(prev => [...prev, newTask]);
    return id;
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    await db.tasks.update(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const removeTask = useCallback(async (id: string) => {
    await db.tasks.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, removeTask }}>
      {children}
      <GlobalTaskManager />
    </TaskContext.Provider>
  );
};

export const useTaskManager = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTaskManager must be used within TaskProvider');
  return context;
};

const GlobalTaskManager: React.FC = () => {
  const { tasks, removeTask } = useTaskManager();
  const [isMinimized, setIsMinimized] = useState(false);

  const activeTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'error');

  if (tasks.length === 0) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-24 right-8 z-[120] w-80 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl bg-opacity-90"
    >
      <div className="p-4 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-violet-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Neural Task Manager</span>
          {activeTasks.length > 0 && (
            <span className="bg-violet-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse">
              {activeTasks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => tasks.forEach(t => t.status !== 'running' && removeTask(t.id))} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="max-h-80 overflow-y-auto p-4 space-y-3 custom-scrollbar"
          >
            {tasks.map(task => (
              <div key={task.id} className="bg-[var(--bg-primary)]/50 p-3 rounded-2xl border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {task.status === 'running' ? (
                      <Loader2 size={14} className="text-violet-400 animate-spin shrink-0" />
                    ) : task.status === 'completed' ? (
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                    ) : task.status === 'error' ? (
                      <AlertCircle size={14} className="text-red-400 shrink-0" />
                    ) : (
                      <Loader2 size={14} className="text-[var(--text-secondary)] shrink-0" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-tight truncate text-[var(--text-primary)]">
                      {task.name}
                    </span>
                  </div>
                  <button onClick={() => removeTask(task.id)} className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-secondary)]">
                    <X size={12} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      className={`h-full transition-all duration-500 ${task.status === 'error' ? 'bg-red-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    />
                  </div>
                  <span className="text-[9px] font-black font-mono text-violet-400 w-8 text-right">
                    {task.progress}%
                  </span>
                </div>
                
                {task.error && (
                  <p className="text-[8px] text-red-400 font-bold uppercase tracking-wider truncate">
                    {task.error}
                  </p>
                )}
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8 opacity-50">
                <p className="text-[10px] font-black uppercase tracking-widest">No active tasks</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
