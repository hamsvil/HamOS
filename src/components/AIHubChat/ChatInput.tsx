 
import React from 'react';
import { Video, Mic, FileText, X, Paperclip, Phone, StopCircle, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SelectedFile } from '../../types/ai';
import { CLONES } from '../../constants/aiClones';

interface ChatInputProps {
  handleSend: (e: React.FormEvent) => void;
  selectedFiles: SelectedFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<SelectedFile[]>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  input: string;
  setInput: (val: string) => void;
  isRecording: boolean;
  recordingTime: number;
  startRecording: () => void;
  stopRecording: () => void;
  startLiveCall: () => void;
  isLoading: boolean;
  activeClone: typeof CLONES[0];
}

export const ChatInput: React.FC<ChatInputProps> = ({
  handleSend,
  selectedFiles,
  setSelectedFiles,
  fileInputRef,
  handleFileUpload,
  input,
  setInput,
  isRecording,
  recordingTime,
  startRecording,
  stopRecording,
  startLiveCall,
  isLoading,
  activeClone
}) => {
  return (
    <div className="p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent">
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-wrap gap-2 mb-3 px-4"
          >
            {selectedFiles.map((f, i) => (
              <motion.div 
                key={i} 
                layout
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="relative group"
              >
                <div className="w-16 h-16 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden flex items-center justify-center shadow-lg">
                  {f.type.startsWith('image/') ? (
                    <img src={f.base64} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : f.type.startsWith('video/') ? (
                    <Video size={20} className="text-blue-400" />
                  ) : f.type.startsWith('audio/') ? (
                    <Mic size={20} className="text-emerald-400" />
                  ) : (
                    <FileText size={20} className="text-zinc-500" />
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-full p-1 border border-zinc-700 shadow-xl transition-colors"
                >
                  <X size={10} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form 
        onSubmit={handleSend}
        className="relative group"
      >
        <div className={`flex items-center gap-2 bg-zinc-900/60 backdrop-blur-2xl rounded-2xl px-4 py-3 border transition-all duration-300 shadow-2xl ${
          isLoading ? 'border-emerald-500/20 ring-1 ring-emerald-500/10' : 'border-zinc-800 group-focus-within:border-emerald-500/40 group-focus-within:ring-1 group-focus-within:ring-emerald-500/20'
        }`}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors"
            title="Add Files"
          >
            <Paperclip size={20} />
          </motion.button>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-zinc-100 text-sm resize-none min-h-[24px] max-h-48 py-1 placeholder:text-zinc-600"
            placeholder={isRecording ? `Recording... ${recordingTime}s` : `Tanya ${activeClone.name}...`}
            disabled={isRecording}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as any);
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 192)}px`;
            }}
          />

          <div className="flex items-center gap-1.5">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={startLiveCall}
              className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors hidden sm:flex"
              title="Live Call"
            >
              <Phone size={18} />
            </motion.button>
            
            {isRecording ? (
              <motion.button 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                type="button"
                onClick={stopRecording}
                className="p-2 text-red-500"
                title="Stop Recording"
              >
                <StopCircle size={20} />
              </motion.button>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={startRecording}
                className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors"
                title="Voice Note"
              >
                <Mic size={20} />
              </motion.button>
            )}

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit" 
              disabled={isLoading || isRecording || (!input.trim() && selectedFiles.length === 0)} 
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                isLoading || isRecording || (!input.trim() && selectedFiles.length === 0)
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]'
              }`}
            >
              {isLoading ? (
                <Sparkles size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </motion.button>
          </div>
        </div>
        
        {/* Progress indicator for long inputs or uploads */}
        {isLoading && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            className="absolute -bottom-1 left-0 h-0.5 bg-emerald-500/50 blur-[1px] rounded-full"
          />
        )}
      </form>
      
      <div className="mt-2 text-center">
        <p className="text-[8px] text-zinc-700 uppercase tracking-[0.2em] font-bold">
          Neural Link Active • Singularity Engine v1.0-OMEGA
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
