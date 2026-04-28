 
import React, { useState } from 'react';
import { Send, Mic, Paperclip, X, StopCircle } from 'lucide-react';

interface AIHubInputAreaProps {
  input: string;
  setInput: (val: string) => void;
  onSend: (e: React.FormEvent) => void;
  isLoading: boolean;
  onStop: () => void;
  attachments: any[]; // Using any[] to match SelectedFile or File
  onAttach: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isRecording: boolean;
  onToggleRecording: () => void;
}

export const AIHubInputArea: React.FC<AIHubInputAreaProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  attachments,
  onAttach,
  onRemoveAttachment,
  fileInputRef,
  isRecording,
  onToggleRecording
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        onSend(e as any as React.FormEvent);
      }
    }
  };

  return (
    <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0">
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] px-3 py-1.5 rounded-full text-xs">
              <span className="truncate max-w-[150px]">{file.name || file.file?.name}</span>
              <button onClick={() => onRemoveAttachment(i)} className="hover:text-red-400" disabled={isLoading}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors disabled:opacity-50"
        >
          <Paperclip size={20} />
        </button>
        
        <textarea
          id="aihub-chat-input"
          aria-label="Pesan Chat"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={isLoading ? "Sedang memproses..." : "Ketik pesan..."}
          className="flex-1 bg-transparent border-none outline-none resize-none py-2 min-h-[40px] max-h-[120px] text-[var(--text-primary)] placeholder-[var(--text-secondary)] disabled:opacity-50"
          rows={1}
        />

        {isLoading ? (
          <button 
            onClick={onStop}
            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
            aria-label="Hentikan"
            title="Hentikan"
          >
            <StopCircle size={20} />
          </button>
        ) : (
          <>
            <button 
              onClick={onToggleRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
              aria-label={isRecording ? "Berhenti Merekam" : "Mulai Merekam"}
              title={isRecording ? "Berhenti Merekam" : "Mulai Merekam"}
            >
              <Mic size={20} />
            </button>
            <button 
              onClick={onSend}
              disabled={!input.trim() && attachments.length === 0}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Kirim Pesan"
              title="Kirim Pesan"
            >
              <Send size={20} />
            </button>
          </>
        )}
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onAttach} 
        className="hidden" 
        multiple 
      />
      
      <div className="text-center mt-2 text-[10px] text-[var(--text-secondary)]">
        AI dapat membuat kesalahan. Mohon verifikasi informasi penting.
      </div>
    </div>
  );
};
