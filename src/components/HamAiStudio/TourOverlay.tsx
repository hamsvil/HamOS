import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TourOverlayProps {
  step: number;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
}

export default function TourOverlay({ step, onClose, onNext, onBack }: TourOverlayProps) {
  return (
    <div className="fixed inset-0 z-[110] pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" onClick={onClose} />
      <div 
        className="absolute bg-[var(--bg-tertiary)] border border-blue-500/50 rounded-xl p-4 shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-300 w-64"
        style={{
          left: step === 0 ? '80px' : step === 1 ? '80px' : step === 2 ? '80px' : '50%',
          top: step === 0 ? '80px' : step === 1 ? '140px' : step === 2 ? '200px' : '50%',
          transform: step > 2 ? 'translate(-50%, -50%)' : 'none'
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Step {step + 1} of 4</span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={14} /></button>
        </div>
        <h4 className="font-bold text-[var(--text-primary)] mb-1">
          {step === 0 ? 'AI Chat Assistant' : 
           step === 1 ? 'Code Preview' : 
           step === 2 ? 'Templates' : 
           'Ready to Build?'}
        </h4>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {step === 0 ? 'Ask Ham Engine to build anything. It uses multi-agent orchestration for high-quality code.' : 
           step === 1 ? 'View and edit your generated code here. You can even run web apps directly!' : 
           step === 2 ? 'Start quickly with pre-built templates for Games, Utilities, and more.' : 
           'Use the Export Manager to download your project or build an APK directly on your device.'}
        </p>
        <div className="flex justify-between items-center mt-4">
            <button 
                onClick={onBack} 
                disabled={step === 0}
                className="p-1 rounded hover:bg-white/10 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <ChevronLeft size={16} />
            </button>
            
            <div className="flex gap-2">
                <button onClick={onClose} className="text-xs font-medium text-gray-500 hover:text-gray-300">Skip</button>
                <button 
                    onClick={onNext} 
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md flex items-center gap-1"
                >
                    {step === 3 ? 'Finish' : 'Next'} <ChevronRight size={12} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
