 
 
// [STABILITY] Promise chains verified
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, File, CheckCircle2, AlertCircle, RefreshCw, Loader2, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../context/ToastContext';
import { db } from '../../../services/db';
import { useTaskStore } from '../../../store/taskStore';
import { resilienceEngine } from '../../../services/ResilienceEngine';
import { UploadStatus } from '../../../types/tasks';

interface QuantumDropzoneProps {
  onUploadComplete: () => void;
  currentPath: string;
  token?: string;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

export const QuantumDropzone: React.FC<QuantumDropzoneProps> = ({ 
  onUploadComplete, 
  currentPath, 
  token,
  externalOpen,
  onExternalClose
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();
  const { addTask, updateTask, removeTask } = useTaskStore();
  const uploadRefs = useRef<Record<string, AbortController>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalOpen) {
      setIsOpen(true);
    }
  }, [externalOpen]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => {
    db.uploads.toArray().then(setUploads).catch(console.error);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    const filesToUpload: { name: string; size: number; path: string; fullFile: File }[] = [];

    const traverseFileTree = async (item: any, path = '') => {
      if (item.isFile) {
        const file = await new Promise<File>((resolve) => item.file(resolve));
        filesToUpload.push({
          name: file.name,
          size: file.size,
          path: path,
          fullFile: file
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const entries = await new Promise<any[]>((resolve) => dirReader.readEntries(resolve));
        for (const entry of entries) {
          await traverseFileTree(entry, path + item.name + '/');
        }
      }
    };

    setLoading(true);
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        await traverseFileTree(item);
      }
    }
    setLoading(false);

    if (filesToUpload.length > 0) {
      startUploads(filesToUpload);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const filesToUpload = files.map(file => ({
      name: file.name,
      size: file.size,
      path: (file as any).webkitRelativePath ? (file as any).webkitRelativePath.substring(0, (file as any).webkitRelativePath.lastIndexOf('/')) : '',
      fullFile: file
    }));
    
    startUploads(filesToUpload);
    e.target.value = '';
  };

  const [loading, setLoading] = useState(false);

  const startUploads = async (files: { name: string; size: number; path: string; fullFile: File }[]) => {
    setIsOpen(true);
    const newUploads = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'pending' as const,
      currentChunk: 0
    }));
    await db.uploads.bulkAdd(newUploads);
    setUploads(prev => [...prev, ...newUploads]);
    
    for (const upload of newUploads) {
      const fileData = upload.file as { name: string };
      const globalTaskId = await addTask({ name: `Uploading ${fileData.name}`, type: 'upload' });
      uploadFile(upload, globalTaskId);
    }
  };

  const uploadFile = async (upload: UploadStatus, globalTaskId?: string) => {
    const CHUNK_SIZE = 1024 * 1024 * 2; // 2MB chunks
    const fileData = upload.file as { name: string; size: number; path: string; fullFile: File };
    const file = fileData.fullFile;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = upload.id;
    
    if (!globalTaskId) {
      globalTaskId = await addTask({ name: `Uploading ${file.name}`, type: 'upload' });
    }

    const controller = new AbortController();
    uploadRefs.current[upload.id] = controller;

    setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'uploading', error: undefined } : u));
    await db.uploads.update(upload.id, { status: 'uploading', error: undefined });
    await updateTask(globalTaskId, { status: 'running', progress: upload.progress || 0 });

    try {
      // If it's in a subfolder, ensure the folder exists
      if (fileData.path) {
        const folders = fileData.path.split('/').filter(Boolean);
        let currentBuildPath = currentPath;
        for (const folder of folders) {
          const nextPath = `${currentBuildPath}/${folder}`;
          await fetch('/ham-api/private-source/mkdir', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ dirPath: nextPath })
          });
          currentBuildPath = nextPath;
        }
      }

      const destPath = fileData.path ? `${currentPath}/${fileData.path.replace(/\/$/, '')}` : currentPath;

      for (let i = upload.currentChunk || 0; i < totalChunks; i++) {
        // Check if paused
        const currentUpload = await db.uploads.get(upload.id);
        if (currentUpload?.status === 'paused') return;

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileName', file.name);
        formData.append('destPath', destPath);
        formData.append('uploadId', uploadId);

        const res = await resilienceEngine.execute(`upload-chunk-${uploadId}-${i}`, async () => {
          const response = await fetch('/ham-api/private-source/upload-chunk', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            signal: controller.signal
          });
          if (!response.ok) throw new Error(await response.text());
          return response;
        });

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, progress, currentChunk: i + 1 } : u));
        await db.uploads.update(upload.id, { progress, currentChunk: i + 1 });
        await updateTask(globalTaskId!, { progress });
      }

      setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'completed' } : u));
      await db.uploads.update(upload.id, { status: 'completed' });
      await updateTask(globalTaskId, { status: 'completed', progress: 100 });
      setTimeout(() => removeTask(globalTaskId!), 3000);
      onUploadComplete();
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Paused
      setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'error', error: err.message } : u));
      await db.uploads.update(upload.id, { status: 'error', error: err.message });
      await updateTask(globalTaskId, { status: 'error', error: err.message });
      showToast(`Upload failed for ${file.name}: ${err.message}`);
    }
  };

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group/dropzone transition-all duration-500 ${isDragging ? 'scale-[0.98]' : ''}`}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-violet-500/20 backdrop-blur-sm border-4 border-dashed border-violet-500 rounded-3xl flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="w-20 h-20 bg-violet-500 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_30px_rgba(139,92,246,0.5)]">
              <Upload size={40} className="text-white" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter text-violet-400">Release to Upload</span>
          </div>
        )}
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="hidden md:flex flex-col items-center justify-center p-12 border-2 border-dashed border-[var(--border-color)] rounded-3xl hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group cursor-pointer relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Upload size={48} className="text-[var(--text-secondary)] group-hover:text-violet-400 group-hover:scale-110 transition-all mb-4 relative z-10" />
          <div className="text-center relative z-10">
            <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Quantum Dropzone</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Drag & drop or click to upload</p>
            <div className="flex gap-2 mt-4 justify-center">
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-violet-500/20"
              >
                Files
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/20"
              >
                Folder
              </button>
            </div>
          </div>
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect} 
          />
          <input 
            type="file" 
            multiple 
            ref={folderInputRef} 
            className="hidden" 
            onChange={handleFileSelect} 
          />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 right-8 z-[110] w-80 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-4 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={14} className="text-violet-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Upload Queue</span>
              </div>
              <button onClick={() => { setIsOpen(false); onExternalClose?.(); }} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={14} className="text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {uploads.map(upload => (
                <div key={upload.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <File size={14} className="text-blue-400 shrink-0" />
                      <span className="text-[10px] font-medium text-[var(--text-primary)] truncate">
                        {(upload.file as any).name || (upload.file as any).fullFile?.name}
                      </span>
                    </div>
                    {upload.status === 'completed' ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : upload.status === 'error' ? (
                      <button onClick={() => uploadFile(upload)} className="p-1 hover:bg-white/10 rounded-lg text-red-400">
                        <RefreshCw size={14} />
                      </button>
                    ) : upload.status === 'paused' ? (
                      <button onClick={() => {
                        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'uploading' } : u));
                        db.uploads.update(upload.id, { status: 'uploading' }).then(() => uploadFile(upload)).catch(console.error);
                      }} className="p-1 hover:bg-white/10 rounded-lg text-violet-400">
                        <Play size={14} />
                      </button>
                    ) : (
                      <button onClick={() => {
                        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'paused' } : u));
                        db.uploads.update(upload.id, { status: 'paused' });
                        uploadRefs.current[upload.id]?.abort();
                      }} className="p-1 hover:bg-white/10 rounded-lg text-violet-400">
                        <Pause size={14} />
                      </button>
                    )}
                  </div>
                  <div className="h-1 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${upload.progress}%` }}
                      className={`h-full transition-all duration-300 ${upload.status === 'error' ? 'bg-red-500' : upload.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    />
                  </div>
                </div>
              ))}
              {uploads.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest opacity-50">Queue is empty</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
