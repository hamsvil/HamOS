 
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorMessageProps {
  title: string;
  message: string;
  onClose: () => void;
}

export default function ErrorMessage({ title, message, onClose }: ErrorMessageProps) {
  const isAiError = title.toLowerCase().includes('ai') || title.toLowerCase().includes('gemini') || title.toLowerCase().includes('engine');

  if (isAiError) {
    const isShield = message.includes("All Hardware Bridges Occupied");
    
    if (isShield) {
      return (
        <div className="fixed bottom-4 right-4 w-full max-w-sm bg-blue-600/90 backdrop-blur-md text-white rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.5)] border border-blue-400 animate-in zoom-in duration-300 z-[200] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest">Anti-Blank Shield</h4>
              <p className="text-xs opacity-90 mt-0.5">{message}</p>
            </div>
            <button onClick={onClose} className="ml-auto p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed bottom-1 right-1 p-1 opacity-10 hover:opacity-100 transition-opacity cursor-help z-[200]" title={`${title}: ${message}`}>
        <div className="w-1 h-1 bg-red-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-full max-w-sm bg-red-500/90 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-red-400 animate-in slide-in-from-bottom-5 duration-300 z-[200]">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold">{title}</h4>
            <p className="text-sm mt-1 opacity-90">{message}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
