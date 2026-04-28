 
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Terminal, Cpu, Settings, Sparkles, Brain, X, Command, FileCode, Zap, Loader2, Shield } from 'lucide-react';
import { safeStorage } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import { hamEventBus } from '../ham-synapse/core/event_bus';
import { HamEventType } from '../ham-synapse/core/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onSelectFile?: (path: string) => void;
}

const COMMANDS = [
  { id: 'browser', label: 'Quantum Browser', icon: Globe, shortcut: 'B' },
  { id: 'ham-aistudio', label: 'Ham AiStudio', icon: Sparkles, shortcut: 'S' },
  { id: 'memory', label: 'Hamli Memory', icon: Brain, shortcut: 'M' },
  { id: 'terminal', label: 'Terminal', icon: Terminal, shortcut: 'T' },
  { id: 'ai', label: 'AI Hub', icon: Cpu, shortcut: 'A' },
  { id: 'private-source', label: 'PrivateSource', icon: Shield, shortcut: 'P' },
  { id: 'tasks', label: 'Neural Tasks', icon: Zap, shortcut: 'N' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: ',' },
];

export default function CommandPalette({ isOpen, onClose, onSelectTab, onSelectFile }: CommandPaletteProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const savedState = safeStorage.getItem('ham_studio_state');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.generatedProject?.files) {
            setProjectFiles(Object.keys(parsed.generatedProject.files));
          }
        } catch (e: any) {
          console.error("Failed to parse project files for palette", e);
          showToast(`Gagal memuat file proyek: ${e.message}`, 'error');
        }
      }
    }
  }, [isOpen]);

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredFiles = query.length > 1 ? projectFiles.filter(f => 
    f.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5) : [];

  const totalItems = filteredCommands.length + filteredFiles.length;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleAICommand = async () => {
    if (!query.trim()) return;
    
    setIsAILoading(true);
    try {
      // Dispatch to Omni-Synapse for intent analysis
      hamEventBus.dispatch({
        id: `cmd_${Date.now()}`,
        type: HamEventType.UI_INTERACTION,
        timestamp: Date.now(),
        source: 'UI',
        payload: { 
          message: `COMMAND_PALETTE_ACTION: ${query}`,
          context: 'command_palette'
        }
      });
      
      showToast('AI sedang memproses perintah Anda...', 'info');
      onClose();
    } catch (e: any) {
      showToast(`Gagal memproses perintah AI: ${e.message}`, 'error');
    } finally {
      setIsAILoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (totalItems || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (totalItems || 1)) % (totalItems || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        
        if (totalItems === 0 && query.length > 0) {
          handleAICommand();
          return;
        }

        if (selectedIndex < filteredCommands.length) {
          onSelectTab(filteredCommands[selectedIndex].id);
          onClose();
        } else {
          const fileIndex = selectedIndex - filteredCommands.length;
          if (filteredFiles[fileIndex] && onSelectFile) {
            onSelectFile(filteredFiles[fileIndex]);
            onClose();
          }
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, filteredFiles, selectedIndex, onSelectTab, onSelectFile, onClose, totalItems]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--bg-primary)]/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
              {isAILoading ? (
                <Loader2 size="1.2rem" className="text-[#00ffcc] animate-spin" />
              ) : (
                <Search size="1.2rem" className="text-[#00ffcc]" />
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder="Search commands, files, or ask AI..."
                className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]/30 font-medium"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] rounded-md text-[10px] text-[var(--text-secondary)]/40 font-mono">
                <Command size="0.8rem" />
                <span>K</span>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
              {filteredCommands.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1 text-[10px] font-bold text-[var(--text-secondary)]/20 uppercase tracking-widest">Commands</div>
                  {filteredCommands.map((cmd, index) => (
                    <button
                      key={cmd.id}
                      onClick={() => { onSelectTab(cmd.id); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                        index === selectedIndex ? 'bg-[#00ffcc]/10 text-[#00ffcc]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${index === selectedIndex ? 'bg-[#00ffcc]/20' : 'bg-[var(--bg-tertiary)]/50'}`}>
                          <cmd.icon size="1.2rem" />
                        </div>
                        <span className="font-medium text-sm">{cmd.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-40 font-mono text-[10px]">
                        <span>ALT</span>
                        <span>+</span>
                        <span>{cmd.shortcut}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredFiles.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold text-[var(--text-secondary)]/20 uppercase tracking-widest">Files</div>
                  {filteredFiles.map((file, index) => {
                    const itemIndex = index + filteredCommands.length;
                    return (
                      <button
                        key={file}
                        onClick={() => { if (onSelectFile) onSelectFile(file); onClose(); }}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                          itemIndex === selectedIndex ? 'bg-blue-500/10 text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${itemIndex === selectedIndex ? 'bg-blue-500/20' : 'bg-[var(--bg-tertiary)]/50'}`}>
                            <FileCode size="1.2rem" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-sm">{file.split('/').pop()}</div>
                            <div className="text-[10px] opacity-40 font-mono truncate max-w-[300px]">{file}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {totalItems === 0 && query.length > 0 && (
                <button
                  onClick={handleAICommand}
                  className="w-full flex items-center gap-3 px-3 py-4 rounded-xl bg-[#00ffcc]/5 border border-[#00ffcc]/20 text-[#00ffcc] hover:bg-[#00ffcc]/10 transition-all group"
                >
                  <div className="p-2 rounded-lg bg-[#00ffcc]/20 group-hover:scale-110 transition-transform">
                    <Zap size="1.5rem" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Tanya AI: "{query}"</div>
                    <div className="text-[10px] opacity-60 uppercase tracking-widest">Gunakan Ham Engine untuk menjalankan perintah ini</div>
                  </div>
                </button>
              )}

              {totalItems === 0 && query.length === 0 && (
                <div className="py-8 text-center text-[var(--text-secondary)]/30 flex flex-col items-center gap-2">
                  <Search size="2rem" strokeWidth={1} />
                  <p>No results found for "{query}"</p>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-[var(--bg-tertiary)]/40 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-[var(--text-secondary)]/30 font-mono uppercase tracking-widest">
              <div className="flex gap-4">
                <span>↑↓ Navigate</span>
                <span>ENTER Select</span>
              </div>
              <span>ESC Close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
