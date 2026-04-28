import React from 'react';
import { Sparkles, Code, Terminal, Smartphone, Globe, Shield, Zap } from 'lucide-react';

interface WelcomeScreenProps {
  onStartTour: () => void;
  onStartCreating: () => void;
}

const FEATURE_LIST = [
  { icon: <Code size={14} />, text: 'Quantum AI Coding' },
  { icon: <Terminal size={14} />, text: 'Universal Terminal' },
  { icon: <Smartphone size={14} />, text: 'Native APK Builder' },
  { icon: <Globe size={14} />, text: 'Live Web Preview' },
  { icon: <Shield size={14} />, text: 'Agentic Security' },
  { icon: <Zap size={14} />, text: 'Hot Reload' },
];

export default function WelcomeScreen({ onStartTour, onStartCreating }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-[var(--border-color)] text-center p-8 animate-in fade-in zoom-in-95 duration-300">
        <Sparkles size={48} className="mx-auto mb-4 text-blue-400" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Welcome to Ham Engine!</h2>
        <p className="text-[var(--text-secondary)] mb-6 text-sm">Your Quantum AI-powered coding assistant. Describe your app idea, and watch it come to life.</p>
        
        <div className="grid grid-cols-2 gap-3 mb-8">
          {FEATURE_LIST.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5 text-left">
              <div className="text-blue-400">{feature.icon}</div>
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tight">{feature.text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={onStartTour}
            className="px-6 py-3 text-lg font-semibold text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 rounded-lg transition-colors"
          >
            Take a Tour
          </button>
          <button 
            onClick={onStartCreating}
            className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            Start Creating
          </button>
        </div>
      </div>
    </div>
  );
}
