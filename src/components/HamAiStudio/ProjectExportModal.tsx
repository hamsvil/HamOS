 
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Cloud, Smartphone, FileCode, AlertTriangle, CheckCircle, Loader2, CheckSquare, Square, ArrowLeft } from 'lucide-react';
import { ProjectData } from './types';

interface ProjectExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData | null;
  onExport: (type: 'zip' | 'apk', selectedFiles?: Set<string>) => void;
  isExporting: boolean;
  buildStatus?: 'idle' | 'building' | 'success' | 'error';
  onReset?: () => void;
  logs: string[];
}

export default function ProjectExportModal({
  isOpen,
  onClose,
  project,
  onExport,
  isExporting,
  buildStatus = 'idle',
  onReset,
  logs
}: ProjectExportModalProps) {
  const [step, setStep] = useState<'select' | 'configure-zip'>('select');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && project && !isExporting && buildStatus === 'idle') {
      setStep('select');
      setSelectedFiles(new Set((project.files || []).map(f => f.path)));
    }
  }, [isOpen, project, isExporting, buildStatus]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const toggleFile = (path: string) => {
    const newSet = new Set(selectedFiles);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setSelectedFiles(newSet);
  };

  const toggleSelectAll = () => {
    if (!project || !project.files) return;
    if (selectedFiles.size === project.files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(project.files.map(f => f.path)));
    }
  };

  const handleZipExport = () => {
    onExport('zip', selectedFiles);
  };

  const remoteBuildUrl = (import.meta as any).env.VITE_REMOTE_BUILD_URL;
  const isCloudBuildAvailable = !!remoteBuildUrl;

  const allSelected = project && project.files && selectedFiles.size === project.files.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252526]">
              <div className="flex items-center gap-2">
                {step === 'configure-zip' && !isExporting && (
                  <button 
                    onClick={() => setStep('select')}
                    className="mr-2 p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ArrowLeft size={18} className="text-white/70" />
                  </button>
                )}
                <Download className="text-blue-400" size={20} />
                <h2 className="text-lg font-semibold text-white">
                  {step === 'configure-zip' ? 'Configure ZIP Export' : 'Export Project'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {isExporting || buildStatus === 'building' || buildStatus === 'success' || buildStatus === 'error' ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    {buildStatus === 'building' || isExporting ? (
                      <>
                        <Loader2 size={20} className="animate-spin text-blue-400" />
                        <span className="text-sm font-mono text-white/80">Processing export...</span>
                      </>
                    ) : buildStatus === 'success' ? (
                      <>
                        <CheckCircle size={20} className="text-green-400" />
                        <span className="text-sm font-mono text-white/80">Export Successful!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={20} className="text-red-400" />
                        <span className="text-sm font-mono text-white/80">Export Failed</span>
                      </>
                    )}
                  </div>
                  
                  <div 
                    ref={logContainerRef}
                    className="flex-1 bg-black/50 rounded-lg border border-white/10 p-3 font-mono text-xs overflow-y-auto min-h-[200px]"
                  >
                    {logs.map((log, i) => (
                      <div key={i} className="mb-1 break-all">
                        <span className="text-white/30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        <span className={
                          log.includes('ERROR') ? 'text-red-400' :
                          log.includes('SUCCESS') ? 'text-green-400' :
                          log.includes('WARN') ? 'text-yellow-400' :
                          'text-white/70'
                        }>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {buildStatus !== 'building' && !isExporting && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          if (onReset) onReset();
                          setStep('select');
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                      >
                        Back to Options
                      </button>
                    </div>
                  )}
                </div>
              ) : step === 'select' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Source Code (ZIP) */}
                  <button
                    onClick={() => setStep('configure-zip')}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/50 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileCode size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Source Code (ZIP)</h3>
                      <p className="text-xs text-white/50 mt-1">
                        Download full source code compatible with Android Studio or VS Code.
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Native APK (Conditional) */}
                  <button
                    onClick={() => onExport('apk')}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-green-500/50 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Smartphone size={20} className="text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Build Native APK</h3>
                      <p className="text-xs text-white/50 mt-1">
                        Build debug APK using local native toolchain (if available).
                      </p>
                    </div>
                  </button>

                  {/* Option 3: Cloud Build */}
                  <button
                    onClick={() => isCloudBuildAvailable && onExport('apk')}
                    disabled={!isCloudBuildAvailable}
                    className={`flex flex-col items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-all group text-left ${isCloudBuildAvailable ? 'hover:bg-white/10 hover:border-purple-500/50' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Cloud size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Cloud Build</h3>
                      <p className="text-xs text-white/50 mt-1">
                        {isCloudBuildAvailable 
                          ? "Build APK using remote build server." 
                          : "Remote build server is currently unavailable. Please use Source Code export."}
                      </p>
                    </div>
                  </button>
                </div>
              ) : (
                // Configure ZIP Step
                <div className="flex flex-col h-full">
                  <div className="mb-4 shrink-0">
                    <p className="text-sm text-white/70">Select files to include in the zip archive.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-white/10 rounded-lg bg-black/20 mb-4">
                    <div 
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 p-2 border-b border-white/10 hover:bg-white/5 cursor-pointer sticky top-0 bg-[#1e1e1e] z-10"
                    >
                        {allSelected ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-white/50" />}
                        <span className="text-xs font-medium text-white">Select All ({(project?.files || []).length} files)</span>
                    </div>
                    
                    <div className="p-1">
                        {(project?.files || []).map((file) => (
                            <div 
                                key={file.path}
                                onClick={() => toggleFile(file.path)}
                                className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer"
                            >
                                {selectedFiles.has(file.path) ? <CheckSquare size={14} className="text-blue-400" /> : <Square size={14} className="text-white/50" />}
                                <FileCode size={14} className="text-white/50" />
                                <span className="text-xs text-white/90 truncate">{file.path}</span>
                            </div>
                        ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleZipExport}
                    disabled={selectedFiles.size === 0}
                    className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:bg-gray-600 disabled:cursor-not-allowed shrink-0"
                  >
                    <Download size={18} />
                    Download .zip ({selectedFiles.size} files)
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#252526] flex justify-end">
              <button
                onClick={onClose}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
