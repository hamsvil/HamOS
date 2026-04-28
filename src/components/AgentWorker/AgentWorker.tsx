import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, Send, Bot, Loader2, Key, Cpu, RotateCw, Plus } from 'lucide-react';
import { AgentWorkerSettings } from './AgentWorkerSettings';
import { agentPersonaRegistry } from '../../sAgent/AgentPersonaRegistry';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export const AgentWorker: React.FC = () => {
  const [agents, setAgents] = useState<{id: string, name: string, role: string}[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('lisa-core');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'Idle' | 'Running' | 'Error'>('Idle');
  const [lastLogs, setLastLogs] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isolateContext, setIsolateContext] = useState(true);
  const [systemOverride, setSystemOverride] = useState('');

  const currentPersona = useMemo(() => agentPersonaRegistry.getPersona(selectedAgent), [selectedAgent]);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAgentStatus(isWorking ? 'Running' : 'Idle');
  }, [isWorking]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (currentPersona?.logFile) {
        try {
          const res = await fetch(`/api/logs/read?file=${encodeURIComponent(currentPersona.logFile)}`);
          const data = await res.json();
          if (data.content) {
            const lines = data.content.trim().split('\n');
            setLastLogs(lines.slice(-5));
          }
        } catch (e) {
          console.error('Failed to fetch logs', e);
        }
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [currentPersona]);

  useEffect(() => {
    // Fetch Agent list from Registry
    const personas = agentPersonaRegistry.listPersonas();
    setAgents(personas.map(p => ({ 
      id: (p as any).featureId || 'unknown', 
      name: p.name, 
      role: p.role 
    })));
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isWorking) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsWorking(true);
    setAgentStatus('Running');
    
    try {
      const res = await fetch('/api/agent-worker/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId: selectedAgent, 
          prompt: userMessage.text,
          isolateContext,
          systemOverride
        })
      });
      const data = await res.json();
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: data.response || "No response received.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
      setAgentStatus('Idle');
    } catch (err: any) {
      setAgentStatus('Error');
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: `Error contacting agent: ${err.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
    } finally {
      setIsWorking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-inner">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            {/* Status indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center">
              {isWorking ? (
                <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </div>
          </div>
          
            <div className="flex flex-col">
            <div className="flex items-center gap-2 px-1 py-0.5">
              <span className="text-sm font-semibold text-zinc-100">{currentPersona?.name || 'Lisa'}</span>
              <span className="text-[10px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/50">v2.0</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                agentStatus === 'Running' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
                agentStatus === 'Error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {agentStatus}
              </span>
              {currentPersona && (
                <span className="text-[9px] bg-violet-900/40 text-violet-400 px-1.5 py-0.5 rounded border border-violet-800/50 font-bold uppercase">
                  {currentPersona.role}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{currentPersona?.description || 'Absolute Executor'}</span>
              {currentPersona?.logFile && (
                <span className="text-[8px] text-zinc-600 font-mono">[{currentPersona.logFile}]</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden lg:block">
          <div className="bg-black/40 rounded-lg border border-zinc-800/50 p-2 font-mono text-[9px] text-zinc-500 overflow-hidden h-10 flex flex-col justify-end">
            {lastLogs.length > 0 ? (
              lastLogs.map((log, i) => (
                <div key={i} className="truncate opacity-60 hover:opacity-100 transition-opacity">
                  <span className="text-emerald-500/50 mr-1">›</span> {log}
                </div>
              ))
            ) : (
              <div className="italic opacity-30 text-center">Waiting for log stream...</div>
            )}
          </div>
        </div>

        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
        >
          <Settings className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Settings Overlay */}
      {showSettings && (
        <AgentWorkerSettings 
          agentId={selectedAgent} 
          setSelectedAgent={setSelectedAgent}
          isolateContext={isolateContext}
          setIsolateContext={setIsolateContext}
          systemOverride={systemOverride}
          setSystemOverride={setSystemOverride}
          onClose={() => setShowSettings(false)} 
        />
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <p>Welcome to Agent Worker.</p>
            <p className="text-sm">Select a sub-agent to begin orchestration.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-emerald-900/40 border border-emerald-800/50 text-emerald-50 rounded-tr-sm' 
                  : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-200 rounded-tl-sm'
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                <div className={`text-[10px] mt-2 ${msg.sender === 'user' ? 'text-emerald-500/70' : 'text-zinc-500'}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {isWorking && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl rounded-tl-sm p-4 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
              <span className="text-sm text-zinc-400">Agent is computing...</span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik tugas untuk sub-agent..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none max-h-32"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isWorking}
            className="absolute right-2 p-2 rounded-lg text-zinc-400 hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
