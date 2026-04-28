 
import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, File, Save, Terminal, Play, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    action: () => void;
  }[];
}

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = React.useMemo(() => commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  ), [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.1 }}
        className="w-full max-w-lg bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-[#333]">
          <Search size={18} className="text-gray-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 outline-none text-sm font-medium"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={filteredCommands[selectedIndex]?.id}
          />
          <div className="text-[10px] bg-[#333] px-1.5 py-0.5 rounded text-gray-400 font-mono">ESC</div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto py-2" id="command-list" role="listbox">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm" role="option">No commands found.</div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                id={cmd.id}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => { cmd.action(); onClose(); }}
                className={`w-full px-4 py-2 flex items-center justify-between text-sm transition-colors ${
                  index === selectedIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-[#2a2a2a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {cmd.icon || <Command size={14} />}
                  <span>{cmd.label}</span>
                </div>
                {cmd.shortcut && (
                  <span className={`text-[10px] font-mono opacity-60 ${index === selectedIndex ? 'text-white' : 'text-gray-500'}`}>
                    {cmd.shortcut}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
        
        <div className="px-4 py-2 bg-[#141414] border-t border-[#333] text-[10px] text-gray-500 flex justify-between">
            <span>Ham AiStudio Command Palette</span>
            <span>{filteredCommands.length} commands</span>
        </div>
      </motion.div>
    </div>
  );
}
