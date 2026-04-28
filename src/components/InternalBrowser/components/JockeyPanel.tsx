 
import React, { useState, useEffect, useRef } from 'react';
import { Music, Zap, Mic, Play, Pause, SkipForward, Volume2, Radio, Sparkles, Brain, Shield, Activity, Database } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { geminiKeyManager } from '../../../services/geminiKeyManager';
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { HamEventType } from '../../../ham-synapse/core/types';
import { autopilotKernel } from '../services/AutopilotKernel';
import { browserPilotService } from '../services/BrowserPilotService';

interface JockeyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTabUrl: string;
  activeTabId: string;
  navigateTab: (id: string, url: string) => void;
  addTab: (url: string) => void;
  closeTab: (id: string) => void;
  reloadTab: (id: string) => void;
  showToast: (message: string, type?: any) => void;
  searchUrl: string;
  getIframe: (id: string) => HTMLIFrameElement | null;
}

export const JockeyPanel: React.FC<JockeyPanelProps> = ({ 
  isOpen, 
  onClose, 
  activeTabUrl,
  activeTabId,
  navigateTab,
  addTab,
  closeTab,
  reloadTab,
  showToast,
  searchUrl,
  getIframe
}) => {
  if (!isOpen) return null;

  const [mood, setMood] = useState<'Chill' | 'Energetic' | 'Focus' | 'Cyberpunk'>('Chill');
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [jockeyText, setJockeyText] = useState('Ready to pilot your web experience.');
  const [isRecording, setIsRecording] = useState(false);
  const [input, setInput] = useState('');
  
  const aiRef = useRef<any>(null);

  useEffect(() => {
    // Sync context to kernel
    autopilotKernel.setContext({
      activeTabId,
      activeTabUrl,
      navigateTab,
      addTab,
      closeTab,
      reloadTab,
      showToast,
      searchUrl,
      getIframe
    });
  }, [activeTabId, activeTabUrl, navigateTab, addTab, closeTab, reloadTab, showToast, searchUrl, getIframe]);

  const handleJockeyAction = async (prompt: string) => {
    if (isAutoPilot) {
      autopilotKernel.start(prompt);
      setJockeyText(`Autonomous Mission Engaged: ${prompt}`);
      return;
    }

    setIsSpeaking(true);
    setJockeyText('Thinking...');

    try {
      // Direct action execution for manual commands
      const response = await autopilotKernel['getDomSnapshot']().then(dom => {
        // We use the kernel's logic but for a single turn
        return autopilotKernel['aiPilotService'].generateResponse(prompt, {
          activeTabUrl,
          domSnapshot: dom,
          memory: [] // Will be populated from Yjs in next iteration
        });
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const actionData = JSON.parse(jsonMatch[0]);
        await browserPilotService.executeAction(actionData.action, actionData.payload, {
          activeTabId, navigateTab, addTab, closeTab, reloadTab, showToast, searchUrl, getIframe
        });
      }

      const text = response.replace(/\{[\s\S]*\}/, '').trim() || "I'm on it, pilot.";
      setJockeyText(text);
      
      hamEventBus.dispatch({
        id: `jockey_speech_${Date.now()}`,
        type: HamEventType.AI_RESPONSE_DELTA,
        timestamp: Date.now(),
        source: 'AI_JOCKEY',
        payload: { text }
      });

    } catch (error) {
      console.error('Jockey Error:', error);
      setJockeyText('Signal lost. Reconnecting...');
    } finally {
      setIsSpeaking(false);
    }
  };

  const toggleAutoPilot = () => {
    const newState = !isAutoPilot;
    setIsAutoPilot(newState);
    if (!newState) {
      autopilotKernel.stop();
      setJockeyText('Autopilot Disengaged. Manual control restored.');
    } else {
      setJockeyText('Awaiting mission parameters for Autopilot...');
    }
  };

  return (
    <div className="h-56 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-md flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.3)] z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio size={16} className="text-[#00ffcc] animate-pulse" />
            {isSpeaking && <Sparkles size={10} className="absolute -top-1 -right-1 text-yellow-400 animate-bounce" />}
          </div>
          <span className="text-xs font-bold tracking-widest text-[#00ffcc] uppercase flex items-center gap-2">
            AI JOCKEY SINGULARITY <Shield size={12} className="text-blue-400" />
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-secondary)]">
            <span className="flex items-center gap-1"><Activity size={10} /> NEURAL LINK: ACTIVE</span>
            <span className="flex items-center gap-1"><Database size={10} /> SYNAPTIC MEMORY: SYNCED</span>
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] px-2 py-1 rounded-full border border-[var(--border-color)]">
            <button onClick={() => setMood('Chill')} className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${mood === 'Chill' ? 'bg-blue-500 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Chill</button>
            <button onClick={() => setMood('Energetic')} className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${mood === 'Energetic' ? 'bg-orange-500 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Energetic</button>
            <button onClick={() => setMood('Focus')} className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${mood === 'Focus' ? 'bg-emerald-500 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Focus</button>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors">
            <Zap size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center px-6 gap-8">
        {/* Visualizer / Avatar */}
        <div className="w-28 h-28 rounded-2xl bg-black/40 border border-[#00ffcc]/20 flex items-center justify-center relative overflow-hidden group">
          <div className={`absolute inset-0 bg-gradient-to-t from-[#00ffcc]/10 to-transparent transition-opacity ${isSpeaking || isAutoPilot ? 'opacity-100' : 'opacity-0'}`} />
          <Brain size={48} className={`transition-all duration-500 ${isSpeaking || isAutoPilot ? 'text-[#00ffcc] scale-110' : 'text-[var(--text-secondary)] opacity-30'}`} />
          {(isSpeaking || isAutoPilot) && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 items-end h-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={`w-1 bg-[#00ffcc] ${isAutoPilot ? 'animate-pulse' : 'animate-bounce'}`} style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
        </div>

        {/* Controls & Output */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] rounded-xl p-3 min-h-[70px] flex items-center relative overflow-hidden">
            {isAutoPilot && <div className="absolute top-0 left-0 w-1 h-full bg-[#00ffcc] animate-pulse" />}
            <p className={`text-sm font-medium italic ${isSpeaking || isAutoPilot ? 'text-[#00ffcc]' : 'text-[var(--text-primary)]'}`}>
              "{jockeyText}"
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (handleJockeyAction(input), setInput(''))}
                placeholder={isAutoPilot ? "Set mission parameters..." : "Command your pilot..."}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-[#00ffcc]/50 transition-all"
              />
              <button 
                onClick={() => { handleJockeyAction(input); setInput(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00ffcc] hover:scale-110 transition-transform"
              >
                <Play size={14} />
              </button>
            </div>

            <button 
              onClick={toggleAutoPilot}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                isAutoPilot 
                  ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc] shadow-[0_0_15px_rgba(0,255,204,0.2)]' 
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)]'
              }`}
            >
              <Zap size={14} className={isAutoPilot ? 'animate-pulse' : ''} />
              AUTO-PILOT {isAutoPilot ? 'ON' : 'OFF'}
            </button>

            <button 
              onMouseDown={() => { setIsRecording(true); handleJockeyAction("Listening..."); }}
              onMouseUp={() => setIsRecording(false)}
              className={`p-2.5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white scale-110 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Mic size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="px-4 py-1 bg-black/20 text-[9px] font-mono text-[var(--text-secondary)]/50 flex justify-between">
        <div className="flex gap-4">
          <span>SYNCED TO OMNI-SYNAPSE V7.2</span>
          <span>PROTOCOL: AGENTIC SUPREME</span>
        </div>
        <span>LATENCY: 18MS | ITERATION: {autopilotKernel['state'].iterationCount}</span>
      </div>
    </div>
  );
};
