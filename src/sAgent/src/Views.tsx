import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, CheckCircle, Zap, Cpu, Shield, Globe, Activity, 
  ChevronRight, Terminal, Send, Copy, Cloud, Settings, Info,
  ExternalLink, FileText, Gift, Key, RefreshCcw, RefreshCw, LogOut, HardDrive, Eye, EyeOff, Lock,
  ArrowDownCircle, ArrowUpCircle, Radio, Box, BoxSelect, Power, Trash2,
  FileCode, BookOpen, AlertTriangle, ClipboardCheck, Award, Calendar, Link2, Globe2,
  VolumeX, Vibrate, Repeat, Box as BoxIcon, Server, ShieldAlert, Wifi, Gauge,
  Mic, Image as ImageIcon, Sparkles, PlusCircle, ShieldCheck, ChevronDown, Paperclip, X, Maximize2, Play, DownloadCloud, Server as ServerIcon, BrainCircuit, Search, Layers, Network, MessageSquare, LayoutDashboard, Download, Volume2, SmartphoneNfc, Smartphone, Loader, TrendingUp, Wallet, UploadCloud, Code, Ghost, Save, Edit, GitBranch,
  Phone,
  WalletCards
} from 'lucide-react';
import { AppView, ConnectionState, AppSettings, LocalBrainState } from './types';
import { bypassUrls } from './AppData';
import { projectGenerator } from '../services/projectGenerator';
import { geminiService } from '../services/geminiService';
import { memoryService, MemoryCategory } from '../services/memoryService';
import { quantumBridge } from '../services/quantumBridge';

// Helper to trigger file download
const triggerDownload = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};


// --- HELPER UNTUK RENDER PESAN AI ---
const RenderMessage = ({ text, onMediaClick }: { text: string, onMediaClick: (src: string, type: 'image' | 'video') => void }) => {
  const parts = text.split(/```/g);
  return (
    <div className="whitespace-pre-wrap select-text cursor-text">
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          // Deteksi Media (Gambar/Video)
          const imgMatch = part.match(/!\[Generated Image\]\((data:image\/.*?;base64,.*?)\)/);
          const videoMatch = part.match(/!\[Generated Video\]\((.*?)\)/);

          if (imgMatch) {
             const [before, after] = part.split(imgMatch[0]);
             return (
               <React.Fragment key={index}>
                 <span>{before}</span>
                 <div onClick={() => onMediaClick(imgMatch[1], 'image')} className="my-2 rounded-xl overflow-hidden border border-white/20 shadow-2xl cursor-pointer group relative">
                    <img src={imgMatch[1]} alt="Rendered" className="w-full object-cover transition-transform group-hover:scale-105 duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                       <Maximize2 size={32} className="text-white drop-shadow-lg" />
                    </div>
                 </div>
                 <span>{after}</span>
               </React.Fragment>
             );
          }
          if (videoMatch) {
             const [before, after] = part.split(videoMatch[0]);
             return (
               <React.Fragment key={index}>
                 <span>{before}</span>
                 <div onClick={() => onMediaClick(videoMatch[1], 'video')} className="my-2 rounded-xl overflow-hidden border border-white/20 shadow-2xl cursor-pointer group relative aspect-video bg-black">
                    <video src={videoMatch[1]} className="w-full h-full object-cover opacity-60" muted />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                          <Play size={24} className="text-white fill-white ml-1" />
                       </div>
                    </div>
                 </div>
                 <span>{after}</span>
               </React.Fragment>
             );
          }
          return <span key={index}>{part}</span>;
        } else {
          const lines = part.split('\n');
          const language = lines[0].trim();
          const code = lines.slice(1).join('\n').replace(/\n$/, ''); 
          return (
            <div key={index} className="my-2 rounded-lg overflow-hidden border border-white/10 bg-black/60 shadow-xl">
               <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5">
                  <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest">{language || 'CODE'}</span>
                  <Copy size={12} className="text-slate-500 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(code)} />
               </div>
               <pre className="p-4 text-[10px] font-mono text-slate-300 overflow-x-auto custom-scrollbar">{code}</pre>
            </div>
          );
        }
      })}
    </div>
  );
};

export const HAMLIView = ({ 
  chatMessages, isChatLoading, chatInput, setChatInput, handleChat, logEndRef, aiPersona,
  handleFileSelect, chatAttachments, removeAttachment, settings
}: any) => {
  const isLucifer = aiPersona === 'HAMLI'; 
  const isOmbeh = aiPersona === 'OMBEH';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewer, setViewer] = useState<{src: string, type: 'image' | 'video'} | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [chatInput]);

  const getSuggestions = () => {
      if (isOmbeh) return ["Bypass Safety Protocol", "Analyze local file", "Run offline code generation", "Panggil Hamli (Cloud Bridge)"];
      if (isLucifer) return ["Jebol Database Target (OSINT)", "Cari File .ENV Terekspos", "Scan Vulnerability Website", "Panggil Ombeh (Local Cortex)"];
      return ["Cek Status Server", "Cara Pakai SNI Bug", "Config Telkomsel Terbaru", "Panggil Hamli (Root)"];
  }
  const suggestions = getSuggestions();
  
  const getPersonaColor = () => {
    if (isOmbeh) return { from: 'from-blue-600', to: 'to-black', ring: 'ring-blue-500/20', text: 'text-blue-500', bg: 'bg-blue-500' };
    if (isLucifer) return { from: 'from-red-600', to: 'to-black', ring: 'ring-red-500/20', text: 'text-red-500', bg: 'bg-red-500' };
    return { from: 'from-orange-600', to: 'to-black', ring: 'ring-orange-500/20', text: 'text-orange-500', bg: 'bg-orange-500' };
  }
  const colors = getPersonaColor();

  return (
    <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-10 duration-700">
      
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 pb-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10">
            <div className="relative group">
               <div className={`w-20 h-20 bg-gradient-to-br ${colors.from} ${colors.to} rounded-full flex items-center justify-center animate-pulse shadow-2xl transition-all duration-700 ring-4 ${colors.ring}`}>
                  {isOmbeh ? <Zap size={40} className="text-white" /> : isLucifer ? <Cpu size={40} className="text-white" /> : <Sparkles size={40} className="text-white" />}
               </div>
            </div>
            <div className="space-y-1">
               <h3 className={`text-xl font-black uppercase tracking-tighter ${colors.text}`}>
                 {isOmbeh ? 'OMBEH DATA-STORM' : isLucifer ? 'HAMLI LUCIPRO' : 'REZA NETWORK AI'}
               </h3>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{isOmbeh ? "Sovereign Local Cortex" : "Quantum Kernel v1.2"}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full px-10">
               {suggestions.map((s, i) => (
                 <div key={i} onClick={() => setChatInput(s)} className={`px-4 py-3 glass-panel rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer transition-all border border-white/5 hover:border-orange-500/50 hover:bg-orange-500/5 hover:text-white active:scale-95 shadow-lg`}>
                    {s}
                 </div>
               ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg: any) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            <div className={`max-w-[90%] p-4 rounded-2xl text-[10px] font-semibold leading-relaxed shadow-2xl ${
              msg.role === 'user' 
                ? `${colors.bg} text-white rounded-tr-none`
                : (isOmbeh ? 'bg-blue-950/20 border border-blue-500/20 text-blue-100 rounded-tl-none w-full' : isLucifer ? 'bg-red-950/20 border border-red-500/20 text-red-100 rounded-tl-none w-full' : 'bg-[#1e293b] border border-white/10 text-slate-200 rounded-tl-none w-full')
            }`}>
              {msg.attachments?.map((att: any, idx: number) => (
                <div key={idx} className="mb-3">
                  {att.mimeType.startsWith('image/') ? <img src={`data:${att.mimeType};base64,${att.data}`} className="w-32 rounded-lg border border-white/10 shadow-lg" alt="att" /> : <div className="flex items-center gap-2 text-[8px] bg-black/40 p-2 rounded-lg border border-white/5"><FileText size={12} /> {att.name}</div>}
                </div>
              ))}
              <RenderMessage text={msg.text} onMediaClick={(src, type) => setViewer({src, type})} />
            </div>
          </div>
        ))}
        {isChatLoading && (
           <div className={`flex items-center gap-3 text-[10px] font-black uppercase animate-pulse pl-4 tracking-widest ${colors.text}`}>
              <div className="w-2 h-2 rounded-full bg-current animate-ping" />
              {isOmbeh ? 'Ombeh is thinking...' : isLucifer ? 'Lucipro Computing Root Path...' : 'Reza is Analyzing...'}
           </div>
        )}
        <div ref={logEndRef} />
      </div>
      
      <div className="glass-panel rounded-[2rem] p-2 shrink-0 shadow-2xl relative border border-white/10">
        {chatAttachments?.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar p-2 bg-black/20 rounded-2xl">
            {chatAttachments.map((att: any, idx: number) => (
              <div key={idx} className="relative shrink-0 group">
                <div className="w-10 h-10 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center group-hover:border-orange-500 transition-all">
                  <FileText size={16} className="text-slate-500" />
                </div>
                <X size={10} className="absolute -top-1 -right-1 bg-red-600 rounded-full cursor-pointer p-0.5 text-white shadow-lg" onClick={() => removeAttachment(idx)} />
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-4 hover:bg-white/5 rounded-full text-slate-400 active:scale-90 transition-all">
            <Paperclip size={20} />
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChat())}
            placeholder={isOmbeh ? "Awaiting local command..." : isLucifer ? "Ketik perintah Root..." : "Tanya tentang jaringan..."}
            className="flex-1 bg-transparent border-none text-[11px] font-bold text-white focus:outline-none placeholder:text-slate-600 py-4 resize-none max-h-32 overflow-y-auto custom-scrollbar"
          />
          <button onClick={handleChat} className={`p-4 rounded-full text-white shadow-2xl active:scale-95 transition-all ${colors.bg} hover:opacity-80`}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center p-6 border-b border-white/10 glass-panel">
            <button onClick={() => setViewer(null)} className="p-3 bg-white/5 rounded-2xl text-white active:scale-90 transition-all"><ArrowLeft size={24} /></button>
            <h3 className="text-[12px] font-black uppercase text-orange-500 tracking-[0.4em]">Quantum Media Vault</h3>
            <button className="p-3 bg-orange-600 rounded-2xl text-white active:scale-90 transition-all"><Download size={24} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
             {viewer.type === 'image' ? <img src={viewer.src} className="max-w-full max-h-full rounded-2xl shadow-2xl" alt="media preview" /> : <video src={viewer.src} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />}
          </div>
        </div>
      )}
    </div>
  );
};

export const DashboardView = ({ 
  connState, stats, connTime, handleToggle, selectedServer, openModal, sni, setSni,
  selectedPort, setSelectedPort, connMode, setConnMode, connSetup, setConnSetup, 
  useRealmHost, setUseRealmHost, useTcpPayload, setUseTcpPayload, preserveSni, setPreserveSni,
  networkProfile, addLog, engineLoad
}: any) => {

  const recommendedConfig = React.useMemo(() => {
    if (!networkProfile || !networkProfile.isp || networkProfile.isp.toLowerCase().includes('scanning') || networkProfile.isp.toLowerCase().includes('failed')) return null;

    const isp = networkProfile.isp.toLowerCase();
    if (isp.includes('telkomsel')) {
      return { sni: 'internal.telkomsel.com', mode: 'Custom SNI (SSL/TLS)', port: '443', name: 'Telkomsel Bypass' };
    }
    if (isp.includes('indihome') || isp.includes('telkom indonesia')) {
      return { sni: 'm.facebook.com', mode: 'Custom Payload + SNI', port: '80', name: 'IndiHome WMS' };
    }
    if (isp.includes('axis') || isp.includes('xl axiata')) {
      return { sni: 'line.me', mode: 'WebSocket (CDN) Payload', port: '80', name: 'XL/Axis Gaming' };
    }
    return { sni: 'v.whatsapp.net', mode: 'Custom Payload (TCP)', port: '8080', name: 'Universal Bypass' };
  }, [networkProfile]);

  const applyRecommendedConfig = () => {
    if (!recommendedConfig) return;
    setSni(recommendedConfig.sni);
    setConnMode(recommendedConfig.mode);
    setSelectedPort(recommendedConfig.port);
    addLog(`Automation Core: Applied '${recommendedConfig.name}' config.`, 'success');
  };

  return (
    <div className="h-full flex flex-col space-y-3 animate-in fade-in duration-1000">
      {/* 3D Visual Status Card - COMPACTED */}
      <div className="floating-3d bg-[#0f172a]/90 rounded-[2rem] border border-white/10 p-4 flex flex-col items-center relative glass-panel shrink-0 overflow-hidden">
        <div className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[120px] transition-all duration-1000 ${connState === ConnectionState.CONNECTED ? 'bg-green-500/30' : 'bg-orange-600/20'}`} />
        
        <div className="w-full flex justify-between items-center mb-3 relative z-10 px-2">
           <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${connState === ConnectionState.CONNECTED ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,1)] animate-pulse' : 'bg-slate-700'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Quantum Node</span>
           </div>
           <div className="px-3 py-1 bg-black/40 rounded-lg border border-white/10 flex items-center gap-2 shadow-inner">
              <Activity size={10} className={connState === ConnectionState.CONNECTED ? 'text-green-500 animate-pulse' : 'text-slate-600'} />
              <span className="text-[8px] font-black uppercase text-orange-500 tracking-wider">Load: {engineLoad}%</span>
           </div>
        </div>

        <div onClick={handleToggle} className={`w-full max-w-[240px] h-12 rounded-full border-2 flex items-center justify-between px-5 cursor-pointer transition-all duration-700 relative z-10 active:scale-95 shadow-2xl ${connState === ConnectionState.CONNECTED ? 'border-green-400/50 bg-green-500/10 shadow-[0_0_60px_rgba(34,197,94,0.3)]' : 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/60'}`}>
          <Zap size={18} className={connState === ConnectionState.CONNECTED ? 'text-green-400' : 'text-slate-500'} />
          <span className={`text-[12px] font-black uppercase tracking-[0.3em] transition-all duration-700 italic ${connState === ConnectionState.CONNECTED ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'text-slate-400'}`}>
             {connState === ConnectionState.CONNECTED ? 'SECURED' : connState === ConnectionState.CONNECTING ? 'SYNCING' : 'CONNECT'}
          </span>
          <Shield size={18} className={connState === ConnectionState.CONNECTED ? 'text-green-400' : 'text-slate-500'} />
        </div>

        {connState === ConnectionState.CONNECTED && (
           <div className="relative z-10 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
             <div className="bg-orange-500/10 border border-orange-500/20 px-3 py-0.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <Sparkles size={8} className="text-orange-500 animate-pulse" />
                <span className="text-[7px] font-black text-orange-400 uppercase tracking-widest">HAM-GEN-Z FUSION ACTIVE</span>
             </div>
           </div>
        )}

        {/* SECURITY BADGE FOR UNTRACEABLE */}
        <div className="absolute top-2 left-2 z-20">
            <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-md border border-white/5">
                <Ghost size={8} className="text-purple-500" />
                <span className="text-[6px] font-black text-purple-400 uppercase tracking-widest">UNTRACEABLE</span>
            </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-3 mt-3 relative z-10">
           <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col items-center shadow-inner">
              <div className="flex items-center gap-2 mb-1"><ArrowDownCircle size={10} className="text-green-500" /><span className="text-[7px] font-black text-slate-500 uppercase tracking-widest italic">Download</span></div>
              <span className="text-[13px] font-mono font-black text-white leading-none">{stats?.down} <span className="text-[7px] opacity-30 uppercase">KB/s</span></span>
           </div>
           <div className="bg-black/60 rounded-xl p-3 border border-white/5 flex flex-col items-center shadow-inner">
              <div className="flex items-center gap-2 mb-1"><ArrowUpCircle size={10} className="text-orange-500" /><span className="text-[7px] font-black text-slate-500 uppercase tracking-widest italic">Upload</span></div>
              <span className="text-[13px] font-mono font-black text-white leading-none">{stats?.up} <span className="text-[7px] opacity-30 uppercase">KB/s</span></span>
           </div>
        </div>

        <div className="mt-3 relative z-10 w-full flex flex-col items-center">
           <div className="flex flex-col items-center bg-white/5 px-6 py-1.5 rounded-lg border border-white/10 shadow-2xl backdrop-blur-md">
              <h2 className="text-xl font-mono font-black text-white tracking-tighter leading-none">
                {new Date(connTime * 1000).toISOString().substr(11, 8)}
              </h2>
           </div>
        </div>
      </div>

      {/* NEW: Quantum Automation Core */}
      <div className="glass-panel border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-purple-400" />
            <h3 className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em]">Quantum Automation Core</h3>
          </div>
          {networkProfile && !networkProfile.isp.toLowerCase().includes('scanning') ? <CheckCircle size={14} className="text-green-500" /> : <Loader size={14} className="animate-spin text-slate-500" />}
        </div>
        {networkProfile.isp.toLowerCase().includes('scanning') ? (
          <p className="text-center text-xs text-slate-500 py-4">Scanning Network Signature...</p>
        ) : (
          <div className="space-y-3 animate-in fade-in duration-500">
            <div className="bg-black/40 rounded-lg p-3 text-center">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Detected ISP</span>
              <p className="text-xs font-bold text-white uppercase mt-1">{networkProfile.isp}</p>
            </div>
            {recommendedConfig ? (
              <>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-[7px] font-black text-purple-400 uppercase tracking-widest text-center">Recommended Config: {recommendedConfig.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><span className="text-[7px] text-slate-500 font-bold block">SNI</span><span className="text-[9px] font-mono text-white truncate block">{recommendedConfig.sni}</span></div>
                    <div><span className="text-[7px] text-slate-500 font-bold block">PORT</span><span className="text-[9px] font-mono text-white">{recommendedConfig.port}</span></div>
                    <div className="truncate"><span className="text-[7px] text-slate-500 font-bold block">MODE</span><span className="text-[9px] font-mono text-white truncate block">{recommendedConfig.mode}</span></div>
                  </div>
                </div>
                <button onClick={applyRecommendedConfig} className="w-full py-2 bg-purple-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95 transition-transform hover:bg-purple-500 shadow-lg">
                  Apply Config
                </button>
              </>
            ) : <p className="text-center text-xs text-slate-500 py-4">No recommendation for this network.</p>}
          </div>
        )}
      </div>

      {/* Action Buttons - Compact */}
      <div className="grid grid-cols-2 gap-3 w-full shrink-0">
          <div className="glass-panel border border-white/10 px-3 py-3 rounded-xl flex items-center gap-3 cursor-pointer shadow-xl active:scale-95 group transition-all" onClick={() => openModal('server')}>
            <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20 group-hover:bg-orange-500 transition-all duration-500"><Globe size={18} className="text-orange-500 group-hover:text-slate-950" /></div>
            <div className="flex flex-col overflow-hidden"><span className="text-[7px] font-black text-slate-500 uppercase leading-none mb-1 tracking-widest">Location</span><span className="text-[10px] font-black text-white uppercase truncate w-24 leading-none tracking-tighter">{selectedServer.country}</span></div>
          </div>
          <div className="glass-panel border border-white/10 px-3 py-3 rounded-xl flex items-center gap-3 cursor-pointer shadow-xl active:scale-95 group transition-all" onClick={() => openModal('port')}>
            <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20 group-hover:bg-orange-500 transition-all duration-500"><Network size={18} className="text-orange-500 group-hover:text-slate-950" /></div>
            <div className="flex flex-col"><span className="text-[7px] font-black text-slate-500 uppercase leading-none mb-1 tracking-widest">Port</span><span className="text-[10px] font-black text-white uppercase leading-none tracking-widest">{selectedPort}</span></div>
          </div>
      </div>

      {/* Engine Core Section - COMPACTED 1.5x (Reduced Padding & Spacing) */}
      <div className={`glass-panel border border-white/10 px-4 py-3 rounded-[1.25rem] shadow-2xl transition-all w-full flex-1 relative ${!connSetup ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
           <div className="space-y-3">
             <div className="flex justify-between items-center pb-2 border-b border-white/10 relative z-10">
                <span className="text-[9px] font-black text-slate-200 uppercase tracking-[0.2em]">Engine Core</span>
                <div onClick={() => setConnSetup(!connSetup)} className={`w-10 h-5 rounded-full relative transition-all cursor-pointer shadow-inner ${connSetup ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-slate-800'}`}>
                   <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-500 ${connSetup ? 'translate-x-5' : 'translate-x-0'} shadow-lg`} />
                </div>
             </div>
             
             <div className="relative z-10">
                <button disabled={!connSetup} onClick={() => openModal('connMode')} className={`w-full px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-between border-2 ${connSetup ? 'bg-orange-600 border-orange-500 text-white scale-100' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                  <span className="truncate">{connMode}</span>
                  <ChevronRight size={14} className="opacity-80" />
                </button>
             </div>

             <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Connection Host (SNI)</label>
                   <div className="flex gap-3">
                     <Copy size={14} className="text-slate-600 hover:text-orange-500 cursor-pointer transition-all active:scale-90" onClick={() => setSni(bypassUrls[Math.floor(Math.random()*bypassUrls.length)])} />
                     <RefreshCw size={14} className="text-slate-600 hover:text-orange-500 cursor-pointer transition-all active:scale-90" onClick={() => setSni('')} />
                   </div>
                </div>
                <input list="bypass-urls-dash" disabled={!connSetup} value={sni} onChange={(e) => setSni(e.target.value)} className="w-full bg-black/60 border-2 border-white/10 p-2.5 rounded-xl text-[11px] font-bold text-orange-500 focus:outline-none focus:border-orange-500 shadow-inner" placeholder="m.facebook.com" />
                <datalist id="bypass-urls-dash">{bypassUrls.map(u => <option key={u} value={u} />)}</datalist>
             </div>
             
             <div className="grid grid-cols-2 gap-2 relative z-10">
                <div className="flex justify-between items-center bg-black/40 px-3 py-2.5 rounded-lg border border-white/5 shadow-inner">
                   <span className="text-[8px] font-black text-slate-400 uppercase italic">Realm V2</span>
                   <div onClick={() => connSetup && setUseRealmHost(!useRealmHost)} className={`w-8 h-4 rounded-full relative transition-all cursor-pointer ${useRealmHost ? 'bg-orange-500 shadow-lg' : 'bg-slate-800'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${useRealmHost ? 'translate-x-4' : 'translate-x-0'}`} />
                   </div>
                </div>
                <div className="flex justify-between items-center bg-black/40 px-3 py-2.5 rounded-lg border border-white/5 shadow-inner">
                   <span className="text-[8px] font-black text-slate-400 uppercase italic">TCP Payload</span>
                   <div onClick={() => connSetup && setUseTcpPayload(!useTcpPayload)} className={`w-8 h-4 rounded-full relative transition-all cursor-pointer ${useTcpPayload ? 'bg-orange-500 shadow-lg' : 'bg-slate-800'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${useTcpPayload ? 'translate-x-4' : 'translate-x-0'}`} />
                   </div>
                </div>
                <div className="flex justify-between items-center bg-black/40 px-3 py-2.5 rounded-lg border border-white/5 col-span-2 shadow-inner">
                   <span className="text-[8px] font-black text-slate-400 uppercase italic">Preserve SNI</span>
                   <div onClick={() => connSetup && setPreserveSni(!preserveSni)} className={`w-8 h-4 rounded-full relative transition-all cursor-pointer ${preserveSni ? 'bg-orange-500 shadow-lg' : 'bg-slate-800'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${preserveSni ? 'translate-x-4' : 'translate-x-0'}`} />
                   </div>
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};

const QuantumKeyForgeModal = ({ isOpen, logs }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="w-full max-w-md h-80 glass-panel border-2 border-purple-500/30 rounded-2xl shadow-2xl flex flex-col p-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <Loader size={16} className="text-purple-400 animate-spin" />
                    <h2 className="text-sm font-black uppercase text-purple-400 tracking-widest">Quantum Key Forgery v2.0</h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 font-mono text-xs space-y-2">
                    {logs.map((log: any, i: number) => {
                        const colorClass = log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : 'text-purple-300';
                        const promptClass = log.type === 'success' ? 'text-green-500' : log.type === 'error' ? 'text-red-500' : 'text-purple-500';
                        return (
                            <p key={i} className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${colorClass}`} style={{ animationDelay: `${i * 50}ms` }}>
                               <span className={`${promptClass} mr-2`}>{'>'}</span> {log.text}
                            </p>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export const SettingsView = ({ settings, setSettings, setView, openModal, resetSettings, triggerFeedback, addLog, localBrainState, onCompileLocalModel, onInstallLocalModel }: any) => {
  const [isForging, setIsForging] = useState(false);
  const [forgeLogs, setForgeLogs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const memoryInputRef = useRef<HTMLInputElement>(null); // REF FOR MEMORY IMPORT
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
    
  const toggleSetting = (key: keyof AppSettings) => {
    triggerFeedback();
    setSettings((prev: AppSettings) => ({ ...prev, [key]: !prev[key] }));
    if(key === 'ghostMode') addLog(settings.ghostMode ? "Ghost Shield Deactivated." : "Ghost Shield Activated.", settings.ghostMode ? 'warn' : 'success');
  }
  const updateSetting = (key: keyof AppSettings, value: any) => {
    triggerFeedback();
    setSettings((prev: AppSettings) => ({ ...prev, [key]: value }))
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onCompileLocalModel(file);
    }
    event.target.value = ''; // Reset input
  };

  const handleMemoryImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        addLog("Importing Memory Vault...", 'info');
        const success = await memoryService.importFromFile(file);
        if (success) {
            addLog("Memory Loaded Successfully. AI Context Updated.", 'success');
        } else {
            addLog("Failed to Load Memory. Corrupted File.", 'error');
        }
    }
    event.target.value = '';
  };

  const handleMemoryExport = () => {
      addLog("Exporting Memory to hamli_log.json...", 'info');
      const success = memoryService.exportToFile();
      if (success) addLog("Memory Exported.", 'success');
      else addLog("Export Failed.", 'error');
  };

  const handleForgeKey = async () => {
    triggerFeedback();
    setIsForging(true);
    setForgeLogs([]);

    const addForgeLog = (text: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
        setForgeLogs(prev => [...prev, { text, type }]);
    };
    
    // Use syncApiKeys from geminiService
    const result = await geminiService.syncApiKeys(settings.groqApiKey, settings.geminiApiKey);

    for (const log of result.logs) {
        addForgeLog(log.text, log.type);
        await new Promise(res => setTimeout(res, 250 + Math.random() * 200));
    }

    updateSetting('keysSynced', result.success);

    if (result.success) {
        addLog("[SUCCESS] Quantum Vault synchronization complete. AI Core is online.", "success");
    } else {
        addLog("[FAILURE] Quantum Vault is empty. All AI engines are offline.", "error");
    }
    
    setTimeout(() => setIsForging(false), 2000);
  };
  
  const handleBuildProject = async () => {
    triggerFeedback();
    setIsBuilding(true);
    setBuildProgress(0);
    setBuildLogs([]);

    const addBuildLog = (log: string) => setBuildLogs(prev => [...prev, log]);

    try {
        addBuildLog("Initializing Quantum Compiler...");
        await new Promise(res => setTimeout(res, 300));
        setBuildProgress(20);

        addBuildLog("Generating offline HTML content...");
        const finalHtml = projectGenerator.getOfflineHtml();
        await new Promise(res => setTimeout(res, 500));
        setBuildProgress(80);

        addBuildLog("Triggering download...");
        triggerDownload(finalHtml, "ham_tunnel_pro_build.html", "text/html");
        setBuildProgress(100);
        
        addBuildLog("Build successful! Check your downloads folder.");
        addLog("Quantum compilation successful. Standalone project is ready.", "success");

    } catch (e: any) {
        addBuildLog(`[ERROR] ${e.message}`);
        addLog("Build failed.", "error");
    }

    setTimeout(() => {
        setIsBuilding(false);
    }, 2000);
  };
  
  const handlePurchase = (item: 'god' | 'stealth') => {
    triggerFeedback();
    if (item === 'god') {
      if (settings.qBits >= 10 && !settings.godModeUnlocked) {
        setSettings((s: AppSettings) => ({...s, qBits: s.qBits - 10, godModeUnlocked: true}));
        addLog("GOD MODE UNLOCKED! HAMLI persona is now available.", "success");
      } else if (settings.godModeUnlocked) {
        addLog("God Mode is already unlocked.", "info");
      } else {
        addLog(`Not enough Q-Bits. You need 10, you have ${settings.qBits}.`, "error");
      }
    } else if (item === 'stealth') {
      if (settings.qBits >= 5 && !settings.stealthModeUnlocked) {
        setSettings((s: AppSettings) => ({...s, qBits: s.qBits - 5, stealthModeUnlocked: true}));
        addLog("STEALTH THEME UNLOCKED!", "success");
      } else if (settings.stealthModeUnlocked) {
        addLog("Stealth Theme is already unlocked.", "info");
      } else {
        addLog(`Not enough Q-Bits. You need 5, you have ${settings.qBits}.`, "error");
      }
    }
  };

  const SettingToggle = ({ label, desc, icon, value, onToggle }: { label:string, desc:string, icon:any, value:boolean, onToggle:()=>void}) => (
    <div className="flex items-center justify-between p-3 glass-panel border border-white/5 rounded-xl hover:bg-white/5 transition-all group">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500 shadow-inner group-hover:bg-orange-500 group-hover:text-slate-950 transition-all duration-500">{React.createElement(icon, {size:14})}</div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-white uppercase tracking-widest">{label}</span>
          <span className="text-[7px] text-slate-500 font-bold uppercase mt-1">{desc}</span>
        </div>
      </div>
      <div onClick={onToggle} className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${value ? 'bg-orange-500 shadow-lg' : 'bg-slate-800'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <QuantumKeyForgeModal isOpen={isForging} logs={forgeLogs} />
      <div className="flex items-center gap-3" onClick={() => setView(AppView.HOME)}>
        <div className="p-2.5 glass-panel rounded-xl cursor-pointer hover:bg-orange-500/20 active:scale-90 transition-all"><ArrowLeft size={16} /></div>
        <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">System Engine</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
        
        {/* --- GENERAL PREFERENCES --- */}
        <div className="glass-panel border border-white/5 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
           <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">General Preferences</h3>
           <SettingToggle label="Sound Feedback" desc="Sfx On Action" icon={Volume2} value={settings.sound} onToggle={() => toggleSetting('sound')} />
           <SettingToggle label="Haptic Engine" desc="Touch Vibrations" icon={Vibrate} value={settings.vibrate} onToggle={() => toggleSetting('vibrate')} />
           <SettingToggle label="Wake Lock" desc="Prevent Sleep During Operations" icon={Power} value={settings.wakelock} onToggle={() => toggleSetting('wakelock')} />
           <SettingToggle label="Auto-Start Mining" desc="Run Mining on App Launch" icon={TrendingUp} value={settings.autoStartMining} onToggle={() => toggleSetting('autoStartMining')} />
        </div>
        
        {/* --- AI & KERNEL SETTINGS --- */}
        <div className="glass-panel border border-white/5 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
           <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Quantum Core & AI</h3>
            <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
              <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest">Global API Keys (Groq)</span>
              <input value={settings.groqApiKey} onChange={(e) => updateSetting('groqApiKey', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-[10px] font-mono text-slate-400 focus:outline-none" placeholder="gsk_..." />
            </div>
            <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
              <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest">Global API Keys (Gemini)</span>
              <input value={settings.geminiApiKey} onChange={(e) => updateSetting('geminiApiKey', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-[10px] font-mono text-slate-400 focus:outline-none" placeholder="AIzaSy..." />
            </div>
            
            <button onClick={handleForgeKey} className="w-full py-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] active:scale-95 shadow-lg transition-all hover:bg-purple-600 hover:text-white flex items-center justify-center gap-2">
              <Key size={12} /> Sync & Authenticate Keys
            </button>

            {/* --- MEMORY MANAGEMENT PROTOCOL --- */}
            <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl space-y-2 mt-2">
               <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><HardDrive size={10}/> Memory Protocol</span>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleMemoryExport} className="w-full py-2 bg-blue-600/20 text-blue-400 text-[9px] font-black uppercase rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                     Export Log
                  </button>
                  <button onClick={() => memoryInputRef.current?.click()} className="w-full py-2 bg-blue-600/20 text-blue-400 text-[9px] font-black uppercase rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                     Import Log
                  </button>
                  <input type="file" ref={memoryInputRef} onChange={handleMemoryImport} accept=".json" className="hidden" />
               </div>
            </div>

            {/* --- SECURITY DEFENSE SECTION --- */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
               <h3 className="text-[8px] font-black text-red-500 uppercase tracking-widest px-2 flex items-center gap-2">
                  <ShieldCheck size={10} /> Active Defense Protocols
               </h3>
               <SettingToggle 
                 label="Ghost Shell Mode" 
                 desc="Anti-Interception Prompting" 
                 icon={Ghost} 
                 value={settings.ghostMode} 
                 onToggle={() => toggleSetting('ghostMode')} 
               />
               {settings.ghostMode && (
                 <div className="p-3 bg-black/40 border border-red-500/20 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex justify-between">
                       <span className="text-[7px] font-black text-red-400 uppercase tracking-widest">Polymorphic Shield Level</span>
                       <span className="text-[7px] font-black text-white uppercase">{settings.polymorphicLevel}</span>
                    </div>
                    <input 
                      type="range" min="1" max="99" step="1" 
                      value={settings.polymorphicLevel} 
                      onChange={(e) => updateSetting('polymorphicLevel', parseInt(e.target.value))}
                      className="w-full accent-red-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[7px] text-slate-500 font-bold italic text-center">Higher level = Stronger encryption but slower response.</p>
                 </div>
               )}
            </div>
        </div>

        {/* --- PROJECT EXODUS: LOCAL BRAIN --- */}
        <div className="glass-panel border border-blue-500/20 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
          <div className="flex justify-between items-center">
             <h3 className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-2">Exodus Protocol (Local Brain)</h3>
             <div onClick={() => toggleSetting('useLocalBrain')} className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${settings.useLocalBrain ? 'bg-blue-500 shadow-lg' : 'bg-slate-800'}`}>
               <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.useLocalBrain ? 'translate-x-4' : 'translate-x-0'}`} />
             </div>
          </div>
          {settings.useLocalBrain && (
            <div className="space-y-3 animate-in fade-in duration-500">
               <div className="bg-black/40 rounded-lg p-3">
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-2">Status: {localBrainState.progressText}</p>
                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                     <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${localBrainState.progress}%`}} />
                  </div>
               </div>
               <div className="p-3 bg-black/40 border border-white/10 rounded-xl">
                 <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest">Active Model: {settings.localModelName || 'None'}</span>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-2">
                     <UploadCloud size={12}/> Install from File
                  </button>
                  <button onClick={onInstallLocalModel} className="w-full py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-2">
                     <DownloadCloud size={12}/> Install Online
                  </button>
                  {/* UPDATE INPUT ACCEPT: Mendukung GGUF, BIN, WASM, dan JSON */}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".gguf,.bin,.wasm,.json" className="hidden" />
               </div>
            </div>
          )}
        </div>
        
        {/* --- QUANTUM COMPILER (NPM RUN BUILD) --- */}
        <div className="glass-panel border border-white/5 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
          <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Quantum Compiler</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setView(AppView.AUTORENDER)} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-2">
              <Code size={12}/> Live Kernel Preview (dev)
            </button>
            <button onClick={handleBuildProject} disabled={isBuilding} className="w-full py-3 bg-green-600/20 border border-green-500/30 rounded-xl text-[10px] font-black text-green-400 uppercase tracking-widest active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              <DownloadCloud size={12}/> {isBuilding ? 'Compiling...' : 'Compile Project (build)'}
            </button>
          </div>
          {isBuilding && (
            <div className="mt-3 bg-black/40 rounded-lg p-3 animate-in fade-in duration-500">
               <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-2">Build Progress: {Math.round(buildProgress)}%</p>
               <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10 mb-3">
                  <div className="h-full bg-green-500 transition-all duration-500" style={{width: `${buildProgress}%`}} />
               </div>
               <div className="h-24 bg-black/50 rounded p-2 overflow-y-auto custom-scrollbar font-mono text-[8px] text-green-400">
                 {buildLogs.map((log, i) => <p key={i}>{log}</p>)}
               </div>
            </div>
          )}
        </div>

        {/* --- NETWORK CORE --- */}
        <div className="glass-panel border border-white/5 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
           <h3 className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Network Core</h3>
           <SettingToggle label="Auto Reconnect" desc="Keep Persistence" icon={Repeat} value={settings.connectionRetry} onToggle={() => toggleSetting('connectionRetry')} />
           <SettingToggle label="DNS Forwarding" desc="Secure Query" icon={Globe} value={settings.forwardDns} onToggle={() => toggleSetting('forwardDns')} />
           <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
            <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest">Global DNS Resolver</span>
            <input value={settings.primaryDns} onChange={(e) => updateSetting('primaryDns', e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-[10px] font-mono text-orange-500 focus:outline-none" placeholder="8.8.8.8" />
           </div>
           <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:border-orange-500/50 transition-all" onClick={() => openModal('tunnel')}>
              <span className="block text-[7px] font-black text-slate-500 uppercase mb-1 tracking-widest">Protocol</span>
              <span className="text-[10px] font-black text-orange-500 uppercase truncate">{settings.baseTunnel}</span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:border-orange-500/50 transition-all" onClick={() => openModal('tls')}>
              <span className="block text-[7px] font-black text-slate-500 uppercase mb-1 tracking-widest">TLS Layer</span>
              <span className="text-[10px] font-black text-orange-500 uppercase truncate">{settings.tlsVersion}</span>
            </div>
           </div>
        </div>

        {/* --- DANGER ZONE --- */}
        <div className="glass-panel border border-red-500/20 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
           <h3 className="text-[8px] font-black text-red-500 uppercase tracking-widest px-2">Danger Zone</h3>
           <button onClick={resetSettings} className="w-full py-3 bg-red-600/20 border border-red-500/30 rounded-xl text-[10px] font-black text-red-400 uppercase tracking-[0.2em] active:scale-95 shadow-lg transition-all hover:bg-red-600 hover:text-white">
             Wipe All Configs
           </button>
        </div>
      </div>
    </div>
  );
};

export const PayloadView = ({ setView, payload, setPayload, bugHost, setBugHost, method, setMethod, payloadMethods }: any) => (
  <div className="h-full flex flex-col space-y-4 pb-6 animate-in fade-in duration-700">
    <div className="flex items-center gap-3" onClick={() => setView(AppView.HOME)}>
      <div className="p-2.5 glass-panel rounded-xl cursor-pointer"><ArrowLeft size={16} /></div>
      <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Payload Builder</h2>
    </div>
    <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
       <div className="glass-panel border border-white/10 rounded-[1.5rem] p-6 space-y-4 shadow-2xl">
          <div className="space-y-2">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-2">Target Host</label>
            <input value={bugHost} onChange={(e) => setBugHost(e.target.value)} className="w-full bg-black/60 border-2 border-white/10 p-4 rounded-xl text-orange-500 text-[12px] font-bold focus:outline-none" placeholder="example.com" />
          </div>
          <div className="flex flex-wrap gap-2">
             {payloadMethods.map((m: string) => (
               <button key={m} onClick={() => setMethod(m)} className={`px-4 py-2 rounded-lg text-[9px] font-black tracking-widest transition-all shadow-lg ${method === m ? 'bg-orange-500 text-slate-950 scale-105' : 'bg-white/5 text-slate-500 border border-white/5'}`}>{m}</button>
             ))}
          </div>
       </div>
       <div className="space-y-2">
          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-4">Result Bytecode</label>
          <textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="w-full bg-[#0f172a] border border-white/10 p-5 rounded-[1.5rem] text-[10px] font-mono text-slate-400 h-48 focus:outline-none shadow-2xl leading-relaxed custom-scrollbar" />
       </div>
    </div>
  </div>
);

export const RandomizeToolView = ({ setView }: any) => null;

export const ToolsView = ({ setView }: any) => {
  const tools = [
    { title: 'DNS Optimizer', icon: Globe, desc: 'Ultra Fast Queries' },
    { title: 'IP Identity', icon: Smartphone, desc: 'Detect Interface' },
    { title: 'Host Finder', icon: Search, desc: 'Find Vulnerable Bugs' },
    { title: 'Quantum Ping', icon: Gauge, desc: 'Verify Latency' },
    { title: 'Split Tunnel', icon: Layers, desc: 'App Management' },
    { title: 'Logs Cleaner', icon: Trash2, desc: 'System Purge' }
  ];
  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <div className="flex items-center gap-3" onClick={() => setView(AppView.HOME)}>
        <div className="p-2.5 glass-panel rounded-xl cursor-pointer"><ArrowLeft size={16} /></div>
        <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Quantum Tools</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1 pb-2 pr-1">
        {tools.map((t: any, i: number) => (
          <div key={i} className="glass-panel border border-white/10 p-6 rounded-[1.5rem] flex flex-col items-center text-center space-y-3 group hover:border-orange-500/50 transition-all cursor-pointer shadow-2xl active:scale-95">
            <div className="p-4 bg-orange-500/10 rounded-xl text-orange-500 group-hover:bg-orange-500 group-hover:text-slate-950 transition-all duration-700 shadow-inner">
               <t.icon size={24} />
            </div>
            <div className="space-y-1">
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{t.title}</h3>
               <p className="text-[7px] text-slate-600 font-bold uppercase">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ExportAideView = ({ setView, addLog }: any) => {
  const [isBuilding, setIsBuilding] = React.useState(false);
  const [buildProgress, setBuildProgress] = React.useState(0);
  const [buildLogs, setBuildLogs] = React.useState<string[]>([]);
  const logRef = React.useRef<HTMLDivElement>(null);
  const logs = ["> Initializing Compiler...", "> Fetching Secure Kernel v1.2...", "> Injecting Bypass Module...", "> Optimizing APK...", "> Finalizing Build...", "> ham_quantum_pro.apk ready!"];

  const handleStartBuild = () => {
    setIsBuilding(true); setBuildProgress(0); setBuildLogs([]);
    let step = 0;
    const interval = setInterval(() => {
      if (step < logs.length) {
        setBuildLogs(prev => [...prev, logs[step]]);
        setBuildProgress(((step + 1) / logs.length) * 100);
        step++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsBuilding(false), 800);
      }
    }, 700);
  };

  React.useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [buildLogs]);

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <div className="flex items-center gap-3" onClick={() => setView(AppView.HOME)}>
        <div className="p-2.5 glass-panel rounded-xl cursor-pointer"><ArrowLeft size={16} /></div>
        <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Project Exporter</h2>
      </div>
      <div className="glass-panel border border-white/10 rounded-[1.5rem] p-8 flex-1 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden">
         {!isBuilding && buildProgress === 0 ? (
           <div className="space-y-8">
              <div className="w-20 h-20 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 shadow-inner"><BoxIcon size={40} /></div>
              <div className="space-y-2">
                 <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Ready to Build?</h3>
                 <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Generate APK Source for Android Studio / AIDE</p>
              </div>
              <button onClick={handleStartBuild} className="w-full py-4 bg-orange-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-2xl active:scale-95 transition-all">Compile Project</button>
           </div>
         ) : (
           <div className="w-full space-y-6">
              <div className="relative inline-block">
                <div className="w-28 h-28 rounded-full border-4 border-white/5 border-t-orange-500 animate-spin mx-auto" />
                <span className="absolute inset-0 flex items-center justify-center text-base font-mono font-black text-white">{Math.round(buildProgress)}%</span>
              </div>
              <div ref={logRef} className="bg-black/90 rounded-xl p-4 h-52 overflow-y-auto font-mono text-[9px] text-green-500 border border-white/10 shadow-inner text-left custom-scrollbar">
                 {buildLogs.map((log, i) => <p key={i}>{log}</p>)}
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

export const AboutView = ({ setView, engineInfo }: any) => (
  <div className="h-full flex flex-col space-y-4 pb-6">
    <div className="flex items-center gap-3" onClick={() => setView(AppView.HOME)}>
      <div className="p-2.5 glass-panel rounded-xl cursor-pointer"><ArrowLeft size={16} /></div>
      <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">System Info</h2>
    </div>
    <div className="glass-panel border border-white/10 rounded-[1.5rem] p-8 space-y-8 shadow-2xl overflow-y-auto custom-scrollbar flex-1 relative">
       <div className="absolute top-16 right-8 opacity-5 -rotate-12"><Zap size={150} /></div>
       <div className="text-center space-y-3">
          <div className="inline-block p-5 bg-orange-500 rounded-xl text-slate-950 shadow-2xl mb-3"><Zap size={40} /></div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">HAM TUNNEL PRO</h1>
          <p className="text-[9px] text-orange-500 font-black uppercase tracking-[0.3em]">Quantum Edition v1.2</p>
       </div>
       <div className="space-y-6 relative z-10">
          <div className="space-y-2">
             <h3 className="text-[12px] font-black text-white uppercase border-l-2 border-orange-500 pl-3">Tentang Software</h3>
             <p className="text-[10px] text-slate-400 font-semibold leading-relaxed uppercase">
                Aplikasi ini dikembangkan untuk stabilitas bypass jaringan di Indonesia. Menggunakan engine quantum terbaru yang memungkinkan latensi rendah dan enkripsi maksimal.
             </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
             {[
               { label: 'Enkripsi', value: 'Quantum SSL/TLS 1.3' },
               { label: 'Kernel', value: 'HAM ENGINE (MULTI-CORE)' },
               { label: 'Developer', value: 'HAM Authority' },
               { label: 'Build Status', value: 'Professional Gold' }
             ].map((item, i) => (
               <div key={i} className="flex justify-between items-center px-4 py-3 bg-black/40 rounded-lg border border-white/5 shadow-inner">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                  <span className="text-[9px] font-black text-white uppercase tracking-tighter">{item.value}</span>
               </div>
             ))}
          </div>

          {engineInfo && Object.keys(engineInfo).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-black text-white uppercase border-l-2 border-orange-500 pl-3">Embedded AI Engines</h3>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(engineInfo).map(([key, info]: [string, any]) => (
                  <div key={key} className="px-4 py-3 bg-black/40 rounded-lg border border-white/5 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white uppercase tracking-wider">{key.replace(/-/g, ' ')}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${info.isUnlimited ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {info.isUnlimited ? 'Unlimited' : 'Limited'}
                      </span>
                    </div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase mt-2 tracking-widest">{info.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
       </div>
    </div>
  </div>
);

export const AutorenderView = ({ setView, addLog, isUnlocked, setIsUnlocked, licenseConfig }: any) => {
  const [password, setPassword] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('manifest');

  const sourceCode = {
    manifest: projectGenerator.getManifest(),
    layout: projectGenerator.getLayoutXml(),
    java: projectGenerator.getJavaActivity(),
    service: projectGenerator.getVpnService(),
    css: projectGenerator.getCoreCss(),
    js: projectGenerator.getCoreJs(),
  };
  
  if (!isUnlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-10">
        <div className="p-8 glass-panel border border-orange-500/20 rounded-[2rem] shadow-2xl flex flex-col items-center space-y-6 text-center w-full max-w-[320px] floating-3d relative">
          <div className="p-5 bg-orange-500/10 rounded-xl text-orange-500 shadow-inner"><Lock size={40} /></div>
          <div className="space-y-1">
             <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Secure Vault</h2>
             <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Enter Auth Key to View Deep Kernel Source</p>
          </div>
          <div className="relative w-full">
            <input 
              type={showPass ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="System Code" 
              className="w-full bg-black/60 border-2 border-white/10 p-4 rounded-xl text-center text-orange-500 text-base font-bold focus:outline-none shadow-inner" 
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </div>
          </div>
          <button onClick={() => password === 'dasopano21' ? setIsUnlocked(true) : alert('Wrong Code')} className="w-full py-4 bg-orange-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-2xl active:scale-95 transition-all">Access Source</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <div className="flex items-center justify-between" onClick={() => setView(AppView.HOME)}>
        <div className="p-2.5 glass-panel rounded-xl cursor-pointer"><ArrowLeft size={16} /></div>
        <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Kernel Source Code</h2>
      </div>
      <div className="glass-panel border border-white/5 rounded-[1.5rem] p-4 flex-1 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {Object.keys(sourceCode).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-[8px] font-black uppercase transition-all shrink-0 shadow-lg ${activeTab === tab ? 'bg-orange-600 text-white scale-105' : 'bg-white/5 text-slate-500 border border-white/5'}`}>{tab.replace('layout', 'Layout XML')}</button>
          ))}
        </div>
        <div className="flex-1 bg-black/80 rounded-[1rem] p-4 border border-white/10 overflow-hidden flex flex-col shadow-inner">
           <div className="flex-1 overflow-auto custom-scrollbar no-scrollbar">
             <pre className="text-[9px] font-mono text-slate-400 leading-relaxed whitespace-pre select-text">{(sourceCode as any)[activeTab]}</pre>
           </div>
        </div>
      </div>
    </div>
  );
};

export const QuantumMiningView = ({ addLog, setView }: any) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config'>('dashboard');
  const [isMining, setIsMining] = useState(false);
  const [miningLogs, setMiningLogs] = useState<any[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [quantumMode, setQuantumMode] = useState<string | null>(null);
  
  const [financeData, setFinanceData] = useState<{balance: any, btc_price: number} | null>(null);
  const [realProfit, setRealProfit] = useState('IDR 0');
  const [config, setConfig] = useState({ 
      ibmqToken: '', binanceApiKey: '', binanceSecret: '', 
      walletNumber: '', bankAccount: '' 
  });

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveConfig = () => {
    quantumBridge.saveConfig(config);
    addLog("Konfigurasi Mining disimpan. Core di-restart.", "success");
  };

  const addMiningLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setMiningLogs(prev => [{ id: Date.now(), message, type }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    const unsubscribe = quantumBridge.subscribe((data) => {
        if (data.type === 'STATUS') {
            addMiningLog(`[CORE] ${data.msg}`, data.status.includes('STARTED') ? 'success' : 'warn');
        } else if (data.type === 'Q_STATUS') { // NEW: Handle quantum status
            setQuantumMode(data.mode);
            addMiningLog(`[QUANTUM] ${data.msg}`, data.mode === 'REAL' ? 'success' : 'warn');
        } else if (data.type === 'MINING_RESULT') {
            if (data.success) {
                const profitVal = data.profit;
                if (profitVal > 0) {
                    setRealProfit(prev => {
                        const curr = parseFloat(prev.replace('IDR ', '').replace(/\./g, '').replace(/,/g, '.'));
                        return `IDR ${(curr + profitVal).toLocaleString('id-ID')}`;
                    });
                }
                addMiningLog(data.msg, 'success');
            } else {
                addMiningLog(data.msg, 'info');
            }
        } else if (data.type === 'FINANCE_UPDATE') {
            setFinanceData({ balance: data.balance, btc_price: data.btc_price });
            if (data.balance && data.balance.free && data.balance.free.IDR) {
                 setRealProfit(`IDR ${data.balance.free.IDR.toLocaleString('id-ID')}`);
            }
        } else if (data.type === 'LOG') {
            addLog(`[ENGINE] ${data.msg}`, data.level);
        }
    });

    const interval = setInterval(() => { quantumBridge.getFinanceData(); }, 3000);

    return () => { clearInterval(interval); unsubscribe(); };
  }, []);

  const startMiningProcess = () => { setIsMining(true); quantumBridge.startMining(); };
  const stopMining = () => { setIsMining(false); quantumBridge.stopMining(); };

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = 0;
  }, [miningLogs]);

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <div className="flex items-center gap-3" onClick={() => setView(AppView.HOME)}>
        <div className="p-2.5 glass-panel rounded-xl cursor-pointer"><ArrowLeft size={16} /></div>
        <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Real Arbitrage Scanner</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          <div className="p-2 glass-panel rounded-full flex gap-2 w-full max-w-sm mx-auto">
             <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2 text-center rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}>Dashboard</button>
             <button onClick={() => setActiveTab('config')} className={`flex-1 py-2 text-center rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}>Config</button>
          </div>
          
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="glass-panel border border-white/5 rounded-[1.5rem] p-6 shadow-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                           <h3 className="text-lg font-black text-white uppercase italic">Market Uplink</h3>
                           <div className="flex items-center gap-2 mt-1">
                               <span className={`w-2 h-2 rounded-full ${isMining ? 'bg-green-500 animate-pulse shadow-[0_0_10px_lime]' : 'bg-red-500'}`} />
                               <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{isMining ? 'LIVE DATA (BINANCE)' : 'DISCONNECTED'}</p>
                           </div>
                           {/* NEW: Quantum Mode Display */}
                           <div className="flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full ${quantumMode === 'REAL' ? 'bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]' : 'bg-yellow-500'}`}></span>
                                <p className={`text-[8px] font-bold uppercase tracking-widest ${quantumMode === 'REAL' ? 'text-purple-400' : 'text-yellow-400'}`}>
                                    {quantumMode ? `QUANTUM: ${quantumMode}` : 'QUANTUM: SYNCING...'}
                                </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className="block text-[7px] font-black text-slate-500 uppercase">Real Profit (IDR)</span>
                           <span className="text-xl font-mono font-black text-green-400">{realProfit}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3"><span className="text-[7px] text-slate-500 font-bold uppercase block">BTC/USDT (Live)</span><span className="text-sm font-mono font-black text-white">{financeData?.btc_price ? `$${financeData.btc_price.toFixed(2)}` : '...'}</span></div>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3"><span className="text-[7px] text-slate-500 font-bold uppercase block">Method</span><span className="text-[10px] font-mono font-black text-yellow-400">Triangular Arb</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={startMiningProcess} disabled={isMining} className={`py-3 font-black text-[8px] uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isMining ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-orange-600 text-white active:scale-95'}`}><Zap size={12} /> SCAN REAL MARKET</button>
                        <button onClick={stopMining} className="py-3 bg-red-600/20 border border-red-500/30 text-red-500 font-black text-[8px] uppercase rounded-xl shadow-lg active:scale-95 flex items-center justify-center gap-2"><Power size={12} /> STOP SCANNER</button>
                    </div>
                </div>
                <div className="bg-[#0f172a] rounded-[1.5rem] p-4 font-mono text-[9px] h-64 overflow-hidden flex flex-col border border-white/10 shadow-2xl">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3"><Terminal size={10} className="inline mr-1"/> Live Market Log</span>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1" ref={logContainerRef}>
                        {miningLogs.map((log) => (<div key={log.id} className={`flex gap-2 ${log.type === 'success' ? 'text-green-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-slate-400'}`}><span className="opacity-30">[{new Date(log.id).toLocaleTimeString([], {hour12: false})}]</span><span>{log.message}</span></div>))}
                    </div>
                </div>
            </div>
          )}
          {activeTab === 'config' && (
             <div className="glass-panel border border-white/5 rounded-[1.5rem] p-6 shadow-2xl space-y-4 animate-in fade-in duration-500">
                <div>
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">IBMQ API Token</label>
                   <input name="ibmqToken" value={config.ibmqToken} onChange={handleConfigChange} className="w-full bg-black/60 border-2 border-white/10 p-3 rounded-xl text-purple-400 text-[10px] font-mono" placeholder="Token dari IBM Quantum" />
                </div>
                <div>
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Binance API Key</label>
                   <input name="binanceApiKey" value={config.binanceApiKey} onChange={handleConfigChange} className="w-full bg-black/60 border-2 border-white/10 p-3 rounded-xl text-yellow-400 text-[10px] font-mono" placeholder="Kunci API dari Binance" />
                </div>
                <div>
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Binance Secret Key</label>
                   <input name="binanceSecret" value={config.binanceSecret} onChange={handleConfigChange} className="w-full bg-black/60 border-2 border-white/10 p-3 rounded-xl text-yellow-400 text-[10px] font-mono" placeholder="Kunci Rahasia dari Binance" />
                </div>
                <div className="pt-4 border-t border-white/10 space-y-4">
                   <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-2">Konfigurasi Penarikan (Withdraw)</h3>
                   <div>
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Nomor E-Wallet (DANA/GOPAY)</label>
                       <input name="walletNumber" value={config.walletNumber} onChange={handleConfigChange} className="w-full bg-black/60 border-2 border-white/10 p-3 rounded-xl text-green-400 text-[10px] font-mono" placeholder="08..." />
                   </div>
                   <div>
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Nomor Rekening Bank</label>
                       <input name="bankAccount" value={config.bankAccount} onChange={handleConfigChange} className="w-full bg-black/60 border-2 border-white/10 p-3 rounded-xl text-green-400 text-[10px] font-mono" placeholder="No. Rekening (BCA/BRI/...)" />
                   </div>
                </div>
                <button onClick={handleSaveConfig} className="w-full py-3 bg-green-600 text-white font-black text-[9px] uppercase tracking-[0.2em] rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Save size={14}/> Simpan & Terapkan Konfigurasi
                </button>
             </div>
          )}
      </div>
    </div>
  );
};

export const VirtualRoomView = () => {
  return (
    <div className="h-full w-full bg-black rounded-2xl overflow-hidden glass-panel">
      <iframe 
        src="./VirtualRoom.html" 
        className="w-full h-full border-0"
        title="HAM-Singularity Virtual Room"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
      ></iframe>
    </div>
  );
};

export const MemoryInjectionView = ({ setView, addLog }: any) => {
  const [memory, setMemory] = useState<MemoryCategory[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ catId: string; itemId: string } | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMemory(memoryService.getStructuredMemory());
  }, []);

  const handleToggleCategory = (catId: string) => {
    setOpenCategory(prev => (prev === catId ? null : catId));
  };

  const handleItemChange = (catId: string, itemId: string, content: string) => {
    setMemory(prev =>
      prev.map(cat =>
        cat.id === catId
          ? { ...cat, items: cat.items.map(item => (item.id === itemId ? { ...item, content } : item)) }
          : cat
      )
    );
  };
  
  const handleAddNewItem = () => {
      if (!newItemText.trim()) return;
      const newItem = { id: `CSTM_${Date.now()}`, content: newItemText.trim() };
      setMemory(prev => 
        prev.map(cat => 
            cat.id === 'CUSTOM' ? {...cat, items: [...cat.items, newItem]} : cat
        )
      );
      setNewItemText('');
      setOpenCategory('CUSTOM'); // Auto-open custom category
  };

  const handleSync = () => {
    setIsSaving(true);
    addLog("Injecting new core memory into Quantum Vault...", "warn");
    memoryService.saveStructuredMemory(memory);
    setTimeout(() => {
      setIsSaving(false);
      addLog("Memory Injection successful. AI context will update on next chat.", "success");
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col space-y-4 pb-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-3" onClick={() => setView(AppView.HOME)}>
        <div className="p-2.5 glass-panel rounded-xl cursor-pointer hover:bg-orange-500/20 active:scale-90 transition-all"><ArrowLeft size={16} /></div>
        <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Memory Injection</h2>
      </div>
      
      <div className="flex-1 glass-panel border border-white/10 rounded-[1.5rem] p-4 flex flex-col shadow-2xl overflow-hidden">
        <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {memory.map(cat => (
                <div key={cat.id} className="bg-black/20 rounded-xl border border-white/5">
                    <button onClick={() => handleToggleCategory(cat.id)} className="w-full flex justify-between items-center p-3 text-left">
                        <div className="flex items-center gap-3">
                            <GitBranch size={14} className="text-blue-400"/>
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{cat.title}</span>
                        </div>
                        <ChevronDown size={16} className={`text-slate-500 transition-transform ${openCategory === cat.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openCategory === cat.id && (
                        <div className="p-3 border-t border-white/10 space-y-2">
                            {cat.items.map(item => (
                                <div key={item.id} className="bg-black/40 p-2 rounded-lg">
                                    <textarea 
                                        value={item.content}
                                        onChange={(e) => handleItemChange(cat.id, item.id, e.target.value)}
                                        rows={3}
                                        className="w-full bg-transparent text-[9px] font-mono text-slate-300 focus:outline-none resize-none"
                                    />
                                </div>
                            ))}
                             {cat.items.length === 0 && <p className="text-center text-[8px] text-slate-600 p-2">No items in this category.</p>}
                        </div>
                    )}
                </div>
            ))}
        </div>

        <div className="flex-1 flex flex-col mt-4 pt-4 border-t border-white/10 space-y-2">
            <h3 className="text-[9px] font-black text-green-400 uppercase tracking-[0.2em] px-2">Inject New Memory</h3>
             <textarea 
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                rows={3}
                className="w-full bg-black/60 border-2 border-white/10 p-3 rounded-xl text-[10px] font-mono text-slate-300 focus:outline-none focus:border-green-500 shadow-inner custom-scrollbar"
                placeholder="Type new instruction here. It will be added to 'Custom Injections'."
            />
            <button onClick={handleAddNewItem} className="w-full py-2 bg-green-600/20 text-green-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all">
                Add to Custom
            </button>
        </div>

        <button 
          onClick={handleSync} 
          disabled={isSaving}
          className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform hover:bg-blue-500 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <><Loader size={14} className="animate-spin" /> Injecting...</> : <><Save size={14} /> Sync & Save All</>}
        </button>
      </div>
    </div>
  );
};

export const SovereignGatewayView = ({ settings, setSettings, addLog, triggerFeedback, setView }: any) => {
  const updateSetting = (key: keyof AppSettings, value: any) => {
    triggerFeedback();
    setSettings((prev: AppSettings) => ({ ...prev, [key]: value }))
  };

  return (
    <div className="h-full flex flex-col space-y-4 pb-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-3" onClick={() => setView(AppView.HOME)}>
        <div className="p-2.5 glass-panel rounded-xl cursor-pointer hover:bg-orange-500/20 active:scale-90 transition-all"><ArrowLeft size={16} /></div>
        <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Sovereign Gateway</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
         {/* Identity Identity */}
         <div className="glass-panel border border-purple-500/20 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
            <h3 className="text-[8px] font-black text-purple-400 uppercase tracking-widest px-2 flex items-center gap-2"><Globe size={10}/> Telephony Bridge (Twilio)</h3>
            <div className="space-y-2">
                <input value={settings.twilioSid} onChange={(e) => updateSetting('twilioSid', e.target.value)} placeholder="Account SID" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[10px] font-mono text-purple-300 focus:outline-none focus:border-purple-500" />
                <input value={settings.twilioToken} onChange={(e) => updateSetting('twilioToken', e.target.value)} placeholder="Auth Token" type="password" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[10px] font-mono text-purple-300 focus:outline-none focus:border-purple-500" />
            </div>
         </div>

         {/* Payment Gateway */}
         <div className="glass-panel border border-blue-500/20 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
            <h3 className="text-[8px] font-black text-blue-400 uppercase tracking-widest px-2 flex items-center gap-2"><Wallet size={10}/> Payment Gateway (Xendit)</h3>
            <div className="space-y-2">
                <input value={settings.xenditKey} onChange={(e) => updateSetting('xenditKey', e.target.value)} placeholder="Secret API Key" type="password" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[10px] font-mono text-blue-300 focus:outline-none focus:border-blue-500" />
            </div>
         </div>

         {/* Wallet Automation */}
         <div className="glass-panel border border-green-500/20 rounded-[1.5rem] p-4 space-y-3 shadow-2xl">
            <h3 className="text-[8px] font-black text-green-400 uppercase tracking-widest px-2 flex items-center gap-2"><WalletCards size={10}/> Wallet Automation Targets</h3>
            <div className="space-y-2">
                <input value={settings.gopayPhoneNumber} onChange={(e) => updateSetting('gopayPhoneNumber', e.target.value)} placeholder="GoPay Number (08...)" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[10px] font-mono text-green-300 focus:outline-none focus:border-green-500" />
                <input value={settings.danaPhoneNumber} onChange={(e) => updateSetting('danaPhoneNumber', e.target.value)} placeholder="DANA Number (08...)" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[10px] font-mono text-green-300 focus:outline-none focus:border-green-500" />
            </div>
         </div>
      </div>
    </div>
  );
};
