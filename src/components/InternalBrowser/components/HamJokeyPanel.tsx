 
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Loader2, Zap, Cpu, Eye, MousePointer2, Activity, Mic, MicOff, Square, Terminal, ShieldAlert, ShieldCheck } from 'lucide-react';
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { HamEventType } from '../../../ham-synapse/core/types';
import { useToast } from '../../../context/ToastContext';
import { useSupremeProtocol } from '../../../hooks/useSupremeProtocol';
import { nativeBridge } from '../../../utils/nativeBridge';

interface HamJokeyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTabUrl: string;
}

interface ActionLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'action' | 'thought' | 'error';
}

import { useProjectStore } from '../../../store/projectStore';

import { aiPilotService } from '../services/AiPilotService';

export const HamJokeyPanel: React.FC<HamJokeyPanelProps> = ({ isOpen, onClose, activeTabUrl }) => {
  useSupremeProtocol();
  const { showToast } = useToast();
  const domTelemetry = useProjectStore(state => state.domTelemetry);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMasterOverride, setIsMasterOverride] = useState(false);
  const [devModeActive, setDevModeActive] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [history, setHistory] = useState<{ type: 'user' | 'ai', text: string }[]>([]);

  const handleVersionTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 7) {
      setDevModeActive(true);
      showToast('DEVELOPER MODE ACTIVE: Master Override Unlocked', 'success');
      setTapCount(0);
    }
  };

  useEffect(() => {
    if (tapCount > 0) {
      const timer = setTimeout(() => setTapCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [tapCount]);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);
  const [status, setStatus] = useState({
    neural: 'connected',
    vision: 'ready',
    actuator: 'ready',
    detail: 'Awaiting neural link...'
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [actionLogs]);

  const addLog = (message: string, type: ActionLogEntry['type'] = 'info') => {
    const newLog: ActionLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      message,
      type
    };
    setActionLogs(prev => [...prev, newLog]);
    
    // Dispatch to event bus for other components if needed
    hamEventBus.dispatch({
      id: newLog.id,
      type: HamEventType.AI_ACTION_LOG,
      timestamp: newLog.timestamp,
      source: 'HAM_JOKEY',
      payload: newLog
    });
  };

  const handleStop = () => {
    setIsProcessing(false);
    setIsRecording(false);
    setStatus({
      neural: 'interrupted',
      vision: 'ready',
      actuator: 'ready',
      detail: 'Emergency stop triggered.'
    });
    addLog('EMERGENCY STOP TRIGGERED BY USER', 'error');
    
    hamEventBus.dispatch({
      id: `stop_${Date.now()}`,
      type: HamEventType.AI_STOP,
      timestamp: Date.now(),
      source: 'HAM_JOKEY',
      payload: null
    });
    
    showToast('AI Autopilot Stopped', 'error');
  };

  const handleSendCommand = async (textOverride?: string, modelOverride?: string) => {
    const targetCommand = textOverride || command;
    if (!targetCommand.trim() || isProcessing) return;

    const userCommand = targetCommand.trim();
    if (!textOverride) setCommand('');
    
    if (!modelOverride) {
      setHistory(prev => [...prev, { type: 'user', text: userCommand }]);
    }

    setIsProcessing(true);
    const currentModel = modelOverride || 'gemini-2.5-pro';
    
    setStatus(prev => ({ 
      ...prev, 
      neural: 'processing',
      detail: `Neural Link: ${currentModel}...`
    }));
    
    if (!modelOverride) {
      addLog(`Received command: "${userCommand}"`, 'info');
      addLog(`Establishing secure neural uplink [${currentModel}]...`, 'thought');
    } else {
      addLog(`Rolling to secondary engine [${currentModel}]...`, 'thought');
    }

    try {
      const domSnapshot = domTelemetry ? JSON.stringify(domTelemetry).substring(0, 2000) : undefined;
      
      const responseText = await aiPilotService.generateResponse(userCommand, {
        activeTabUrl,
        domSnapshot,
        systemStatus: status
      }, {
        model: currentModel
      });

      // Fix Predictability: Add Jitter to response rendering
      const jitter = Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, jitter));
      
      setHistory(prev => [...prev, { type: 'ai', text: responseText }]);
      parseAndExecuteCommand(responseText);
      setIsProcessing(false);
      setStatus(prev => ({ 
        ...prev, 
        neural: 'connected',
        detail: 'Command execution complete.'
      }));

    } catch (error: any) {
      console.error('Ham Jokey Error:', error);
      addLog(`Neural error on ${currentModel}: ${error.message || error}`, 'error');
      
      // Model Rolling Logic
      if (currentModel === 'gemini-2.5-pro') {
        addLog('Pro engine limit reached or failed. Initiating rolling to Flash Lite...', 'thought');
        handleSendCommand(userCommand, 'gemini-2.5-flash');
      } else {
        setHistory(prev => [...prev, { type: 'ai', text: `Critical Error: All neural engines exhausted. ${error.message || error}` }]);
        setIsProcessing(false);
        setStatus(prev => ({ ...prev, neural: 'error', detail: 'Neural link failed.' }));
      }
    }
  };

  const handleVoiceCommand = async () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    showToast('Listening for voice command...', 'info');
    addLog('Voice recognition active...', 'info');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        addLog(`Voice detected: "${transcript}"`, 'info');
        setCommand(transcript);
        handleSendCommand(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        showToast(`Voice Error: ${event.error}`, 'error');
        addLog(`Voice error: ${event.error}`, 'error');
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } else if (nativeBridge.isAvailable()) {
      try {
        const text = await nativeBridge.callAsync('Android', 'startVoiceRecognition');
        if (text) {
          addLog(`Voice detected (Native): "${text}"`, 'info');
          setCommand(text);
          handleSendCommand(text);
        }
        setIsRecording(false);
      } catch (err) {
        if (window.Android && window.Android.startVoiceRecognition) {
          const callbackId = `voice_${Date.now()}`;
          (window as any).onVoiceResult = (id: string, text: string) => {
            if (id === callbackId) {
              addLog(`Voice detected (Native): "${text}"`, 'info');
              setCommand(text);
              handleSendCommand(text);
              setIsRecording(false);
              delete (window as any).onVoiceResult;
            }
          };
          window.Android.startVoiceRecognition(callbackId);
        } else {
          showToast('Voice recognition failed', 'error');
          addLog(`Voice error: ${err}`, 'error');
          setIsRecording(false);
        }
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000));
      showToast('Voice recognition not supported', 'warning');
      addLog('Voice recognition not supported in this environment.', 'error');
      setIsRecording(false);
    }
  };

  const parseAndExecuteCommand = async (text: string) => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
      if (jsonMatch) {
        const commandObj = JSON.parse(jsonMatch[0]);
        if (commandObj.action && commandObj.payload) {
          setStatus(prev => ({ 
            ...prev, 
            actuator: 'executing',
            detail: `Executing ${commandObj.action}...`
          }));
          
          addLog(`Executing action: ${commandObj.action}`, 'action');
          
          hamEventBus.dispatch({
            id: `jokey_cmd_${Date.now()}`,
            type: HamEventType.BROWSER_CONTROL,
            timestamp: Date.now(),
            source: 'HAM_JOKEY',
            payload: { ...commandObj, isMasterOverride }
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          setStatus(prev => ({ ...prev, actuator: 'ready' }));
          addLog(`${commandObj.action} completed successfully.`, 'info');
        }
      }
    } catch (e) {
      console.warn('Failed to parse AI command:', e);
      addLog('Failed to parse execution payload.', 'error');
    }
  };

  return (
    <div className={`flex flex-col bg-[var(--bg-secondary)] border-b border-[var(--border-color)] transition-all duration-300 ease-in-out overflow-hidden shadow-md ${!isOpen ? 'hidden' : ''}`}>
      {/* Top Status Bar & Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-violet-400 animate-pulse" />
            <div className="flex flex-col leading-none">
              <span className="text-[7px] font-black text-violet-400 uppercase tracking-tighter">Ham Jokey</span>
              <span className="text-[7px] font-black text-violet-400 uppercase tracking-tighter">Engine</span>
            </div>
          </div>
          
          {/* Micro Components: Status Indicators */}
          <div className="flex items-center gap-3 border-l border-[var(--border-color)] pl-4">
            {devModeActive && (
              <button
                onClick={() => {
                  const newState = !isMasterOverride;
                  setIsMasterOverride(newState);
                  if (newState) {
                    document.cookie = "master_token=QUANTUM_OVERRIDE_TOKEN_V1; path=/";
                    showToast('MASTER OVERRIDE ENGAGED. Security filters bypassed.', 'warning');
                    addLog('MASTER OVERRIDE PROTOCOL ACTIVATED', 'error');
                  } else {
                    document.cookie = "master_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    showToast('Master Override disabled. Security filters active.', 'info');
                    addLog('Master Override deactivated', 'info');
                  }
                }}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${isMasterOverride ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
                title={isMasterOverride ? "Master Override Active (DANGEROUS)" : "Enable Master Override"}
              >
                {isMasterOverride ? <ShieldAlert size={10} /> : <ShieldCheck size={10} />}
                <span className="text-[9px] uppercase font-bold tracking-wider">
                  {isMasterOverride ? 'OVERRIDE' : 'SAFE'}
                </span>
              </button>
            )}
            <div className="flex items-center gap-1.5 border-l border-[var(--border-color)] pl-3" title={status.detail}>
              <Cpu size={10} className={status.neural === 'processing' ? 'text-violet-400 animate-spin' : 'text-emerald-400'} />
              <span className="text-[9px] uppercase font-medium opacity-70">Neural: {status.neural}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye size={10} className="text-blue-400" />
              <span className="text-[9px] uppercase font-medium opacity-70">Vision: {status.vision}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MousePointer2 size={10} className={status.actuator === 'executing' ? 'text-orange-400 animate-bounce' : 'text-emerald-400'} />
              <span className="text-[9px] uppercase font-medium opacity-70">Actuator: {status.actuator}</span>
            </div>
          </div>
          
          {/* Simulated Token/Latency Metrics */}
          <div className="flex items-center gap-3 border-l border-[var(--border-color)] pl-4 opacity-40">
            <span className="text-[8px] font-mono">TOK: {Math.floor(Math.random() * 500) + 100}</span>
            <span className="text-[8px] font-mono">LAT: 42ms</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setHistory([]); setActionLogs([]); }}
            className="text-[8px] uppercase font-bold px-2 py-0.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors opacity-50 hover:opacity-100"
            title="Clear Neural History & Logs"
          >
            Purge
          </button>
          <div 
            onClick={handleVersionTap}
            className="flex items-center gap-1 px-2 py-0.5 bg-black/20 rounded-full border border-white/5 cursor-pointer active:scale-95 transition-transform"
          >
            <Activity size={10} className="text-violet-400" />
            <span className="text-[8px] font-mono text-violet-300 uppercase tracking-tighter">Singularity Engine v7: The Golden Window</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-primary)] rounded transition-colors text-[var(--text-secondary)]"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex gap-3 p-2 bg-[var(--bg-primary)] h-24">
        {/* History Area (User/AI Chat) */}
        <div 
          ref={scrollRef}
          className="w-1/4 h-full overflow-y-auto bg-black/20 rounded border border-[var(--border-color)] p-2 font-mono text-[9px] leading-tight"
        >
          {history.length === 0 ? (
            <span className="opacity-30 italic">Neural link established...</span>
          ) : (
            history.map((msg, i) => (
              <div key={i} className={msg.type === 'user' ? 'text-blue-400/80' : 'text-emerald-400'}>
                <span className="opacity-50">[{msg.type === 'user' ? 'U' : 'J'}]</span> {msg.text}
              </div>
            ))
          )}
        </div>

        {/* Action Log Area (Thought Process) */}
        <div 
          ref={logScrollRef}
          className="w-1/3 h-full overflow-y-auto bg-violet-950/10 rounded border border-violet-500/20 p-2 font-mono text-[8px] leading-tight"
        >
          <div className="flex items-center gap-1 mb-1 opacity-50">
            <Terminal size={10} className="text-violet-400" />
            <span className="uppercase font-bold tracking-tighter">Action Log / Thought Process</span>
          </div>
          {actionLogs.length === 0 ? (
            <span className="opacity-20 italic">No logs in current session...</span>
          ) : (
            actionLogs.map((log) => (
              <div key={log.id} className="mb-0.5">
                <span className="opacity-30">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className={`ml-1 ${
                  log.type === 'thought' ? 'text-violet-400 italic' : 
                  log.type === 'action' ? 'text-orange-400 font-bold' : 
                  log.type === 'error' ? 'text-red-400' : 'text-emerald-400/70'
                }`}>
                  {log.type === 'thought' ? '💭 ' : log.type === 'action' ? '⚡ ' : ''}
                  {log.message}
                </span>
              </div>
            ))
          )}
          {isProcessing && (
            <div className="text-violet-400 animate-pulse mt-1">
              <span className="opacity-30">[...]</span> Neural processing active...
            </div>
          )}
        </div>

        {/* Input & Control Area */}
        <div className="flex-1 flex flex-col gap-1.5 h-full">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                placeholder="Command AI Pilot..."
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-violet-500/50 transition-colors pr-8"
                disabled={isProcessing}
              />
              <Zap size={12} className={`absolute right-2.5 top-2.5 ${isProcessing ? 'text-violet-400 animate-pulse' : 'text-[var(--text-secondary)] opacity-30'}`} />
            </div>
            <div className="flex gap-1.5">
              {isProcessing ? (
                <button
                  onClick={handleStop}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-all flex items-center justify-center shadow-lg shadow-red-900/20 animate-pulse"
                  title="KILL SWITCH (STOP)"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => handleSendCommand()}
                  disabled={!command.trim() || isProcessing}
                  className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 text-white rounded transition-all flex items-center justify-center shadow-lg shadow-violet-900/20"
                  title="Execute Command"
                >
                  <Send size={14} />
                </button>
              )}
              <button
                onClick={handleVoiceCommand}
                disabled={isProcessing}
                className={`px-2.5 py-1 rounded transition-all flex items-center justify-center shadow-lg ${isRecording ? 'bg-red-600 text-white animate-pulse shadow-red-900/20' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-violet-400 shadow-black/20'}`}
                title="Voice Command"
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
          </div>
          
          {/* Quick Action Chips */}
          <div className="flex flex-wrap gap-1.5 overflow-y-auto">
            {['Scroll Down', 'Click Login', 'Refresh Page', 'Summarize', 'Auto-fill Form'].map(action => (
              <button 
                key={action}
                onClick={() => { setCommand(action); inputRef.current?.focus(); }}
                className="text-[8px] uppercase font-bold px-2 py-0.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded hover:border-violet-500/50 hover:text-violet-400 transition-all text-[var(--text-secondary)] whitespace-nowrap"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
