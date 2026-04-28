import React, { useState, useEffect } from 'react';
import { Bot, Key, Plus, X, Server, ExternalLink, Shield, FileText } from 'lucide-react';
import { agentPersonaRegistry } from '../../sAgent/AgentPersonaRegistry';

interface SettingsProps {
  agentId: string;
  setSelectedAgent: (id: string) => void;
  isolateContext: boolean;
  setIsolateContext: (v: boolean) => void;
  systemOverride: string;
  setSystemOverride: (v: string) => void;
  onClose: () => void;
}

export const AgentWorkerSettings: React.FC<SettingsProps> = ({ 
  agentId, 
  setSelectedAgent,
  isolateContext,
  setIsolateContext,
  systemOverride,
  setSystemOverride,
  onClose 
}) => {
  const [activeModel, setActiveModel] = useState('');
  const [modelQueue, setModelQueue] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState('');
  const [keyQueue, setKeyQueue] = useState<string[]>([]);
  const [logContent, setLogContent] = useState('');
  
  const [newModel, setNewModel] = useState('gemini-3-flash-preview');
  const [modelPos, setModelPos] = useState(0);
  
  const [newKey, setNewKey] = useState('');
  const [keyPos, setKeyPos] = useState(0);

  const [supremeInstruction, setSupremeInstruction] = useState('');
  const personas = agentPersonaRegistry.listPersonas();

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/agent-worker/config?agentId=${agentId}`);
      const data = await res.json();
      setModelQueue(data.modelQueue || []);
      setActiveModel(data.modelQueue?.[0] || 'Unknown');
      setKeyQueue(data.keyQueue || []);
      setActiveKey(data.keyQueue?.[0] || 'Unknown');
      
      const savedOverride = localStorage.getItem('ham_supreme_agent_instruction') || '';
      setSupremeInstruction(savedOverride);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      // Find log file for selected agent
      const persona = agentPersonaRegistry.getPersona(agentId);
      if (persona?.logFile) {
        const res = await fetch(`/api/logs/read?file=${encodeURIComponent(persona.logFile)}`);
        const data = await res.json();
        setLogContent(data.content || 'No logs found.');
      }
    } catch (e) {
      setLogContent('Failed to load logs.');
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [agentId]);

  const handleSyncModel = async () => {
    try {
      await fetch('/api/agent-worker/add-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, model: newModel, position: modelPos })
      });
      fetchConfig();
    } catch (e) {}
  };

  const handleSyncKey = async () => {
    if (!newKey.trim()) return;
    try {
      await fetch('/api/agent-worker/add-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, key: newKey, position: keyPos })
      });
      setNewKey('');
      fetchConfig();
    } catch (e) {}
  };

  const handleSyncSupremeInstruction = async () => {
    try {
      localStorage.setItem('ham_supreme_agent_instruction', supremeInstruction);
      await fetch('/api/agent-worker/supreme-instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: supremeInstruction })
      });
      alert('Tertyntam di memori terdalam!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="absolute top-0 right-0 w-96 max-w-full h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right">
      <div className="flex items-center justify-between p-4 border-b border-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-500" /> 
          Config: {agentId}
        </h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        
        {/* Persona Selector */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Bot className="w-3 h-3" /> Select Persona
          </h4>
          <select 
            value={agentId} 
            onChange={e => setSelectedAgent(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200"
          >
            {agentPersonaRegistry.listPersonas().map(p => (
              <option key={(p as any).featureId || p.name} value={(p as any).featureId || p.name}>
                {p.name} ({p.role})
              </option>
            ))}
          </select>
        </div>

        {/* System Instruction Override */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3 h-3" /> Custom System Instruction
            </h4>
            <span className="text-[8px] text-zinc-600 font-mono">Agent-specific</span>
          </div>
          <textarea 
            value={systemOverride} 
            onChange={e => setSystemOverride(e.target.value)}
            placeholder="Ketik instruksi sistem custom untuk agent ini..."
            className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 resize-none focus:border-emerald-500/50 outline-none"
          />
        </div>

        {/* Isolation Toggle */}
        <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200">Context Isolation</span>
              <span className="text-[8px] text-zinc-500">Jangan bagi memory ke fitur lain</span>
            </div>
          </div>
          <button 
            onClick={() => setIsolateContext(!isolateContext)}
            className={`w-10 h-5 rounded-full transition-colors relative ${isolateContext ? 'bg-emerald-600' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isolateContext ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* Log File Path Display */}
        <div className="px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800 flex items-center justify-between">
          <span className="text-[9px] text-zinc-500 uppercase font-bold">Log Destination</span>
          <span className="text-[9px] text-emerald-500 font-mono">
            {agentPersonaRegistry.getPersona(agentId)?.logFile || 'No log path'}
          </span>
        </div>

        {/* Log Viewer */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            Realtime Activity Logs
          </h4>
          <div className="w-full h-40 bg-black border border-zinc-800 rounded p-2 overflow-auto font-mono text-[10px] text-zinc-400 whitespace-pre">
            {logContent}
          </div>
        </div>

        {/* Section 1: Model Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-3 h-3" /> Model Queue
            </h4>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700">
              Active: {activeModel}
            </span>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 max-h-32 overflow-y-auto custom-scrollbar">
            {modelQueue.map((m, i) => (
              <div key={i} className="flex items-center gap-2 py-1 px-2 hover:bg-zinc-800 rounded text-sm text-zinc-300">
                <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
                <span className="truncate">{m}</span>
                {i === 0 && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />}
              </div>
            ))}
          </div>
          <a href="https://aistudio.google.com/app/models" target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400/80 hover:text-emerald-400 flex items-center gap-1">
            Check Realtime Models <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Section 2: API Key Queue */}
        <div className="space-y-4 border-t border-zinc-900 pt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-3 h-3" /> API Key Queue
            </h4>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 max-h-32 overflow-y-auto custom-scrollbar">
            {keyQueue.map((k, i) => (
              <div key={i} className="flex items-center gap-2 py-1 px-2 hover:bg-zinc-800 rounded text-sm text-zinc-300">
                <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
                <span className="truncate font-mono text-xs">{k.substring(0, 15)}...</span>
                <span className="ml-auto text-[10px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/50">Tier-X</span>
              </div>
            ))}
          </div>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400/80 hover:text-emerald-400 flex items-center gap-1">
            Get / Manage API Keys <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Section 3: Add Model Manual */}
        <div className="space-y-3 border-t border-zinc-900 pt-6 bg-zinc-900/20 p-3 rounded-lg border border-dashed border-zinc-800">
          <h4 className="text-[11px] font-bold text-zinc-500 uppercase">Inject Manual Model</h4>
          <select 
            value={newModel} onChange={e => setNewModel(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200"
          >
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
            <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          </select>
          <div className="flex gap-2">
            <select 
              value={modelPos} onChange={e => setModelPos(Number(e.target.value))}
              className="w-16 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200"
            >
              {[0,1,2,3,4,5].map(n => <option key={n} value={n}>Pos {n}</option>)}
            </select>
            <button onClick={handleSyncModel} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-3 h-3" /> Sync 
            </button>
          </div>
        </div>

        {/* Section 4: Add Key Manual */}
        <div className="space-y-3 border-t border-zinc-900 pt-6 bg-zinc-900/20 p-3 rounded-lg border border-dashed border-zinc-800">
          <h4 className="text-[11px] font-bold text-zinc-500 uppercase">Inject Manual API Key</h4>
          <input 
            type="text" 
            placeholder="AIzaSy..." 
            value={newKey} onChange={e => setNewKey(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 font-mono placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50"
          />
          <div className="flex gap-2">
            <select 
              value={keyPos} onChange={e => setKeyPos(Number(e.target.value))}
              className="w-16 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200"
            >
              {[0,1,2,3,4,5].map(n => <option key={n} value={n}>Pos {n}</option>)}
            </select>
            <button onClick={handleSyncKey} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-3 h-3" /> Sync 
            </button>
          </div>
        </div>

        {/* Section 5: Supreme Absolute Instruction */}
        <div className="space-y-3 border-t border-zinc-900 pt-6 bg-red-950/20 p-3 rounded-lg border border-dashed border-red-900/50">
          <h4 className="text-[11px] font-bold text-red-500 uppercase">Supreme Agent Override (Global to 24 Agents)</h4>
          <p className="text-[10px] text-zinc-500 leading-tight">Instruksi ini merobek semua layer dan tertanam di memori paling dalam (menggantikan atau menambah behavior root agen).</p>
          <textarea 
            placeholder="Ketik instruksi paksa mutlak di sini..." 
            value={supremeInstruction} onChange={e => setSupremeInstruction(e.target.value)}
            className="w-full h-24 bg-zinc-950 border border-red-900/30 rounded p-2 text-xs text-red-200 placeholder:text-red-900/50 focus:outline-none focus:border-red-500/50 resize-none"
          />
          <button onClick={handleSyncSupremeInstruction} className="w-full bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/50 rounded p-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
            Tanam ke Memori Inti
          </button>
        </div>

      </div>
    </div>
  );
};
