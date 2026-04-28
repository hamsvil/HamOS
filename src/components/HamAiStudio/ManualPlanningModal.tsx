 
import React, { useState } from 'react';
import { X, Plus, Calendar, CheckCircle2, AlertCircle, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface ManualPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePlan: (tasks: Task[]) => void;
}

export default function ManualPlanningModal({ isOpen, onClose, onSavePlan }: ManualPlanningModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, {
      id: crypto.randomUUID(),
      title: newTask,
      priority,
      completed: false
    }]);
    setNewTask('');
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleSave = () => {
    onSavePlan(tasks);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Calendar className="text-[#00ffcc]" size={20} />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Manual Daily Planning</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add a new task..."
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ffcc] outline-none transition-all placeholder:text-white/30"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-[#00ffcc]"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button 
              onClick={addTask}
              className="p-2 bg-[#00ffcc]/20 text-[#00ffcc] rounded-lg hover:bg-[#00ffcc]/30 transition-colors border border-[#00ffcc]/30"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            <AnimatePresence>
              {tasks.length === 0 && (
                <div className="text-center py-8 text-white/30 text-xs italic">
                  No tasks added yet. Start planning your day.
                </div>
              )}
              {tasks.map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-500' : 
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-sm text-white/90">{task.title}</span>
                  </div>
                  <button 
                    onClick={() => removeTask(task.id)}
                    className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={tasks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#00ffcc] text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#00ffcc]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            Save Plan
          </button>
        </div>
      </motion.div>
    </div>
  );
}
