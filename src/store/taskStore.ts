/* eslint-disable no-useless-assignment */
import { create } from 'zustand';
import { db } from '../services/db';
import { TaskProgress, TaskType, BgInitStatus, BgTaskState } from '../types/tasks';

interface TaskState {
  tasks: TaskProgress[];
  initialized: boolean;
  bgInit: BgInitStatus;
  init: () => Promise<void>;
  setBgInit: (status: Partial<BgInitStatus>) => void;
  addTask: (task: Omit<TaskProgress, 'id' | 'progress' | 'status' | 'createdAt'>) => Promise<string>;
  updateTask: (id: string, update: Partial<TaskProgress>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  initialized: false,
  bgInit: {
    vectorStore: 'idle',
    webContainer: 'idle',
  },
  init: async () => {
    if (get().initialized) return;
    const tasks = await db.tasks.toArray();
    set({ tasks: tasks.sort((a, b) => b.createdAt - a.createdAt), initialized: true });
  },
  setBgInit: (status) => {
    set((state) => ({
      bgInit: { ...state.bgInit, ...status }
    }));
  },
  addTask: async (task) => {
    const id = Math.random().toString(36).substring(7);
    const newTask: TaskProgress = { 
      ...task, 
      id, 
      progress: 0, 
      status: 'pending',
      createdAt: Date.now()
    };
    await db.tasks.add(newTask);
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    return id;
  },
  updateTask: async (id, update) => {
    await db.tasks.update(id, update);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...update } : t)),
    }));
  },
  removeTask: async (id) => {
    await db.tasks.delete(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },
  clearCompleted: async () => {
    const tasks = get().tasks;
    const completedIds = tasks.filter(t => t.status === 'completed' || t.status === 'error').map(t => t.id);
    await db.tasks.bulkDelete(completedIds);
    set((state) => ({
      tasks: state.tasks.filter((t) => !completedIds.includes(t.id)),
    }));
  },
}));
