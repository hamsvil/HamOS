 
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Mic, Plus, ArrowUp, ChevronLeft, X, Cpu, Globe, Calendar, Zap, Loader2, Square, ChevronUp } from 'lucide-react';
import { safeStorage } from '../../utils/storage';
import { shadowEngine } from '../../services/ShadowEngine';
import { debounce } from 'lodash';

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  handleSend: () => void;
  handleCancel?: () => void;
  showSuggestions: boolean;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  handleSuggestionClick: (text: string) => void;
  handleMicClick: () => void;
  handleAttachClick: () => void;
  handlePlanningClick?: () => void;
  handleManualPlanningClick?: () => void;
  handleManualInstructionClick?: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  _isLocalMode: boolean;
  setIsLocalMode: (isLocal: boolean) => void;
}

export default function ChatInput({
  input, setInput, isLoading, handleSend, handleCancel,
  showSuggestions, setShowSuggestions, handleSuggestionClick,
  handleMicClick, handleAttachClick, handlePlanningClick, handleManualPlanningClick, handleManualInstructionClick, handleFileChange, fileInputRef,
  _isLocalMode, setIsLocalMode
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiMode, setAiMode] = useState<'thinking' | 'fast' | 'deep'>(() => {
    return (safeStorage.getItem('ham_ai_mode') as 'thinking' | 'fast' | 'deep') || 'deep';
  });
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Speculative Shadow-Execution (Phase 3)
  const debouncedSpeculate = useCallback(
    debounce((text: string) => {
      if (text.trim().length > 15) {
        shadowEngine.speculate(text);
      }
    }, 1000),
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    debouncedSpeculate(value);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModeSelect = (mode: 'thinking' | 'fast' | 'deep') => {
    setAiMode(mode);
    safeStorage.setItem('ham_ai_mode', mode);
    setIsModeDropdownOpen(false);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Ensure input is visible when focused (Mobile Keyboard Fix)
  const handleFocus = () => {
    // Use requestAnimationFrame for smoother scrolling after layout
    requestAnimationFrame(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  // Offline Detection
  useEffect(() => {
    const handleOffline = () => setIsLocalMode(true);
    const handleOnline = () => {
        // Optional: Notify user they are back online or auto-switch
        // For now, we just let them know via console or toast if we had one here
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    // Initial check
    if (!navigator.onLine) {
      setIsLocalMode(true);
    }

    return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
    };
  }, [setIsLocalMode]);

  const onKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter keydown should just add a newline (default textarea behavior)
    // Send is only triggered by the UI button
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Suggestion Chips */}
      {showSuggestions && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar px-1">
          <Sparkles size={9} className="text-blue-400 shrink-0" />
          <button onClick={() => handleSuggestionClick("Create a simple calculator app")} className="shrink-0 px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] whitespace-nowrap transition-colors active:scale-95" aria-label="Saran: Create a simple calculator app">
            Create a simple calculator app
          </button>
          <button onClick={() => handleSuggestionClick("Build a to-do list with SQLite")} className="shrink-0 px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] whitespace-nowrap transition-colors active:scale-95" aria-label="Saran: Build a to-do list with SQLite">
            Build a to-do list with SQLite
          </button>
          <button onClick={() => setShowSuggestions(false)} className="shrink-0 p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors active:scale-90" aria-label="Tutup Saran" title="Tutup Saran">
            <X size={10} />
          </button>
        </div>
      )}

      {/* Input Box */}
      <div className="flex flex-col border border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] shadow-md focus-within:border-blue-500/40 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
        <textarea
          id="ham-aistudio-chat-input"
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={isLoading ? "AI is thinking..." : "Ask Super Assistant to build, fix, or explain anything..."}
          disabled={isLoading}
          className="w-full bg-transparent border-none outline-none resize-none min-h-[52px] max-h-40 py-4 px-5 text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-base disabled:opacity-50"
          rows={1}
          onKeyDown={onKeyDown}
          aria-label="Pesan Chat Studio"
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange} 
        />
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <button onClick={handleMicClick} disabled={isLoading} className="p-1.5 text-[var(--text-secondary)] hover:text-blue-400 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors disabled:opacity-50" aria-label="Input Suara" title="Input Suara">
              <Mic size={11} />
            </button>
            <button onClick={handleAttachClick} disabled={isLoading} className="p-1.5 text-[var(--text-secondary)] hover:text-blue-400 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors disabled:opacity-50" aria-label="Lampirkan File" title="Lampirkan File">
              <Plus size={11} />
            </button>
            
            {/* AI Mode Selector */}
            <div className="relative" ref={modeDropdownRef}>
              <button 
                onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                disabled={isLoading}
                className="flex items-center gap-1 p-1 px-1.5 text-[var(--text-secondary)] hover:text-purple-400 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors disabled:opacity-50"
                aria-label="Pilih Mode AI" 
                title="Pilih Mode AI"
              >
                {aiMode === 'thinking' ? <Cpu size={10} className="text-blue-400" /> : 
                 aiMode === 'fast' ? <Zap size={10} className="text-yellow-400" /> : 
                 <Sparkles size={10} className="text-purple-400" />}
                <span className="text-[10px] font-medium capitalize">{aiMode}</span>
                <ChevronUp size={9} className={`transition-transform ${isModeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isModeDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="p-1 flex flex-col gap-0.5">
                    <button 
                      onClick={() => handleModeSelect('thinking')}
                      className={`flex items-start gap-2 w-full text-left px-2 py-1.5 text-[10px] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${aiMode === 'thinking' ? 'bg-blue-500/10 text-blue-400' : 'text-[var(--text-primary)]'}`}
                    >
                      <Cpu size={10} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">Thinking Mode</div>
                        <div className="text-[8px] text-[var(--text-secondary)] uppercase tracking-tighter">Ham Engine 3.0 Flash</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => handleModeSelect('fast')}
                      className={`flex items-start gap-2 w-full text-left px-2 py-1.5 text-[10px] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${aiMode === 'fast' ? 'bg-yellow-500/10 text-yellow-400' : 'text-[var(--text-primary)]'}`}
                    >
                      <Zap size={10} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">Fast Mode</div>
                        <div className="text-[8px] text-[var(--text-secondary)] uppercase tracking-tighter">Ham Engine 3.1 Flash Lite</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => handleModeSelect('deep')}
                      className={`flex items-start gap-2 w-full text-left px-2 py-1.5 text-[10px] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors ${aiMode === 'deep' ? 'bg-purple-500/10 text-purple-400' : 'text-[var(--text-primary)]'}`}
                    >
                      <Sparkles size={10} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">Deep Mode</div>
                        <div className="text-[8px] text-[var(--text-secondary)] uppercase tracking-tighter">Ham Engine 3.1 Pro Preview</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <button 
              onClick={handleCancel}
              className="p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center"
              aria-label="Batalkan Proses"
              title="Batalkan Proses"
            >
              <Square size={11} className="fill-current" />
            </button>
          ) : (
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-secondary)] transition-all shadow-sm active:scale-95"
              aria-label="Kirim Pesan"
              title="Kirim Pesan"
            >
              <ArrowUp size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons Below Input */}
      <div className="grid grid-cols-3 gap-1.5 mt-1.5 w-full">
        {handlePlanningClick && (
          <button onClick={handlePlanningClick} className="w-full flex justify-center items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[10px] font-medium text-[var(--text-secondary)] hover:text-purple-400 hover:bg-[var(--bg-tertiary)] transition-colors active:scale-95">
            <Zap size={9} />
            Auto Plan
          </button>
        )}
        {handleManualPlanningClick && (
          <button onClick={handleManualPlanningClick} className="w-full flex justify-center items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[10px] font-medium text-[var(--text-secondary)] hover:text-green-400 hover:bg-[var(--bg-tertiary)] transition-colors active:scale-95">
            <Calendar size={9} />
            Manual Plan
          </button>
        )}
        {handleManualInstructionClick && (
          <button onClick={handleManualInstructionClick} className="w-full flex justify-center items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[10px] font-medium text-[var(--text-secondary)] hover:text-yellow-400 hover:bg-[var(--bg-tertiary)] transition-colors active:scale-95">
            <Sparkles size={9} />
            Instruction
          </button>
        )}
      </div>
    </div>
  );
}
