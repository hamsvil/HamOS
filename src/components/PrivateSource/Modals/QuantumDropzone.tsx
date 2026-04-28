 
import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../context/ToastContext';
import { useTaskManager } from './GlobalTaskManager';

interface QuantumDropzoneProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  password: string;
  onUploadComplete: () => void;
}

interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export const QuantumDropzone: React.FC<QuantumDropzoneProps> = ({ isOpen, onClose, currentPath, password, onUploadComplete }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Fix for webkitdirectory TS error
  React.useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const { showToast } = useToast();
  const { addTask, updateTask, removeTask } = useTaskManager();
  const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB chunks

  const uploadFile = async (task: UploadTask) => {
    const { file, id } = task;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Register in Global Task Manager
    const globalTaskId = await addTask({ name: `Uploading ${file.name}`, type: 'upload' });
    await updateTask(globalTaskId, { status: 'running', progress: 0 });

    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'uploading' } : t));

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const relativePath = file.webkitRelativePath ? file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf('/')) : '';
        const finalDestPath = relativePath ? `${currentPath}/${relativePath}` : currentPath;

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileName', file.name);
        formData.append('uploadId', uploadId);
        formData.append('destPath', finalDestPath);

        const res = await fetch('/ham-api/private-source/upload-chunk', {
          method: 'POST',
          headers: { 'x-private-source-auth': password },
          body: formData
        });

        if (!res.ok) throw new Error(await res.text());

        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        setTasks(prev => prev.map(t => t.id === id ? { ...t, progress } : t));
        await updateTask(globalTaskId, { progress });
      }

      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed', progress: 100 } : t));
      await updateTask(globalTaskId, { status: 'completed', progress: 100 });
      setTimeout(() => removeTask(globalTaskId), 3000);
      onUploadComplete();
    } catch (err: any) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'error', error: err.message } : t));
      await updateTask(globalTaskId, { status: 'error', error: err.message });
      showToast(`Upload failed: ${file.name}`);
    }
  };

  const handleFiles = (files: File[]) => {
    const newTasks = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending' as const
    }));
    setTasks(prev => [...prev, ...newTasks]);
    newTasks.forEach(uploadFile);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Simple file drop for now. Full directory traversal requires webkitGetAsEntry
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [currentPath, password, onUploadComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <Upload size={20} className="text-violet-400" />
            </div>
            <h3 className="font-medium text-[var(--text-primary)]">Neural Dropzone</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
            <X size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-[2rem] transition-all duration-500 overflow-hidden ${isDragging ? 'border-violet-500 bg-violet-500/5 scale-[0.99]' : 'border-[var(--border-color)] hover:border-violet-500/30 bg-[var(--bg-tertiary)]'}`}
        >
          <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
            <div className={`p-6 rounded-3xl transition-all duration-500 ${isDragging ? 'bg-violet-500 text-white shadow-[0_0_30px_rgba(167,139,250,0.5)] scale-110' : 'bg-violet-500/10 text-violet-400'}`}>
              <Upload size={48} className={isDragging ? 'animate-bounce' : ''} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Initialize Uplink</h3>
              <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-50">Drag & Drop or Click to Upload</p>
            </div>
            <div className="flex gap-4 mt-2">
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-xl text-xs font-bold transition-all border border-violet-500/20"
              >
                Select Files
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-500/20"
              >
                Select Folder
              </button>
            </div>
            <input 
              type="file" 
              multiple 
              ref={fileInputRef}
              className="hidden" 
              onChange={(e) => handleFiles(Array.from(e.target.files || []))}
            />
            <input 
              type="file" 
              multiple 
              ref={folderInputRef}
              className="hidden" 
              onChange={(e) => handleFiles(Array.from(e.target.files || []))}
            />
          </div>
        </div>

        <AnimatePresence>
          {tasks.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border border-[var(--border-color)] bg-[var(--bg-tertiary)] max-h-64 overflow-y-auto rounded-2xl mt-4"
            >
              <div className="p-4 space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="bg-[var(--bg-secondary)] p-3 rounded-2xl border border-[var(--border-color)] flex items-center gap-4">
                    <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
                      <File size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-[var(--text-primary)] truncate uppercase tracking-tight">{task.file.name}</span>
                        <span className="text-[10px] font-black text-violet-400">{task.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          className={`h-full ${task.status === 'error' ? 'bg-red-500' : 'bg-violet-500'}`}
                        />
                      </div>
                    </div>
                    <div className="shrink-0">
                      {task.status === 'uploading' && <Loader2 size={16} className="animate-spin text-violet-400" />}
                      {task.status === 'completed' && <CheckCircle size={16} className="text-emerald-400" />}
                      {task.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
                      <button 
                        onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}
                        className="ml-2 p-1 hover:bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-secondary)]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
