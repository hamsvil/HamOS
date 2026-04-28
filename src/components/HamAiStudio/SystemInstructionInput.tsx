 
import React, { useState, useEffect } from 'react';
import { Settings, X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemInstructionInputProps {
  isOpen: boolean;
  onClose: () => void;
  instruction: string;
  onSave: (instruction: string) => void;
}

export default function SystemInstructionInput({ isOpen, onClose, instruction, onSave }: SystemInstructionInputProps) {
  const [localInstruction, setLocalInstruction] = useState(instruction);

  useEffect(() => {
    setLocalInstruction(instruction);
  }, [instruction]);

  const handleSave = () => {
    onSave(localInstruction);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute bottom-16 left-4 right-4 z-50 bg-[#1e1e1e] border border-[#00ffcc]/30 rounded-xl shadow-2xl overflow-hidden p-4"
      >
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 text-[#00ffcc]">
            <Settings size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Manual System Instruction</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        <textarea
          value={localInstruction}
          onChange={(e) => setLocalInstruction(e.target.value)}
          placeholder="Enter custom system instructions for the AI..."
          className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white font-mono focus:border-[#00ffcc] outline-none resize-none custom-scrollbar placeholder:text-white/20"
        />

        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-white/10">
          <button 
            onClick={() => setLocalInstruction('')}
            className="px-3 py-1.5 text-[10px] text-white/50 hover:text-red-400 transition-colors uppercase tracking-wider"
          >
            Clear
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#00ffcc]/20 transition-all"
          >
            <Save size={12} />
            Apply Instruction
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
