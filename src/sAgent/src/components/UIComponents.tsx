import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, Cpu, Zap, Terminal, MessageCircle, Settings, Info, 
  X, Menu, ChevronRight, LayoutDashboard, Database, Shield,
  MoreVertical, FileText, Gift, Key, RefreshCcw, LogOut, Send, MessageSquare,
  Trash2, RefreshCw, Smartphone, Radio, HardDrive, SmartphoneNfc, Wifi, Signal,
  BellRing, ShieldCheck, DownloadCloud, UploadCloud, Power, Gauge, Share2, Bug, Sparkles, Code, History, Paperclip, PlusCircle
} from 'lucide-react';
import { AppView, ChatSession } from '../types';

const _T = (b64: string) => { try { return atob(b64); } catch(e) { return b64; } };

const S = {
  APP: "SEFNIFR1bm5lbCB2MS4yIFBybw==",
  IMPORTER: "SW1wb3J0IENvbmZpZw==",
  EXPORTER: "RXhwb3J0IENvbmZpZw==",
  RENEW: "UmVuZXcgQWNjZXNz",
  VOUCHER: "UmVkZWVtIFZvdWNoZXI=",
  SERVER_APPS: "U2VydmVyIEFwcHM=",
  CLEAR_LOGS: "Q2xlYXIgU3lzdGVtIExvZ3M=",
  UPDATE: "Q2hlY2sgVXBkYXRl",
  PAYLOAD: "UGF5bG9hZCBHZW5lcmF0b3I=",
  SOURCE: "QXV0b3JlbmRlciBjb2RlIGFwaw==",
  ABOUT: "QWJvdXQ="
};

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


export const Sidebar = ({ isOpen, setOpen, currentView, setView, addLog, networkInfo }: any) => {

  const displayInfo = networkInfo || { ip: 'Scanning...', type: 'Detecting...', isp: 'Scanning...' };

  return (
    <>
      <div className={`fixed inset-0 z-[700] bg-black/98 transition-opacity duration-700 backdrop-blur-3xl ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)} />
      <aside className={`fixed top-0 left-0 h-full w-72 bg-[#020617] z-[701] transform transition-transform duration-700 border-r border-white/5 flex flex-col shadow-[20px_0_100px_rgba(0,0,0,0.9)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="p-6 bg-gradient-to-br from-orange-600 to-orange-800 text-white relative overflow-hidden shrink-0 shadow-2xl">
           <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12 scale-150"><Zap size={200} /></div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-black rounded-2xl border border-white/10 shadow-2xl"><Shield size={24} className="text-orange-500" /></div>
              <div>
                 <h2 className="font-black text-xl uppercase italic tracking-tighter leading-none">{_T(S.APP)}</h2>
                 <p className="text-[8px] font-black opacity-80 uppercase tracking-widest mt-1">Quantum Engine</p>
              </div>
           </div>
           
           <div className="mt-6 flex flex-col relative z-10 bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
              <div className="flex justify-between items-center mb-3">
                 <span className="text-[8px] font-black uppercase text-white/50 tracking-[0.2em]">Network ID</span>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
                    <span className="text-[7px] font-black uppercase text-green-500 tracking-tighter">SECURED</span>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <Signal size={18} className="text-white/80" />
                 <span className="text-base font-black uppercase tracking-tight text-white truncate">{displayInfo.isp}</span>
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-white/10">
                 <span className="text-xs font-mono font-black text-white/90">{displayInfo.ip}</span>
                 <span className="text-[10px] font-mono font-black text-white/50">{displayInfo.type}</span>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar mt-2">
          {[
            { id: AppView.HOME, label: 'DASHBOARD', icon: LayoutDashboard },
            { id: AppView.HAMLI, label: 'AI CHAT (ROOT)', icon: Sparkles },
            { id: AppView.QUANTUM_MINING, label: 'QUANTUM MINING', icon: Cpu },
            { id: AppView.PAYLOAD, label: 'BUILDER', icon: Database },
            { id: AppView.AUTORENDER, label: 'KERNEL SOURCE', icon: Code },
            { id: AppView.EXPORT_AIDE, label: 'EXPORTER', icon: HardDrive },
            { id: AppView.SETTINGS, label: 'SETTINGS', icon: Settings },
            { id: AppView.TOOLS, label: 'SERVER APPS', icon: Globe },
            { id: AppView.ABOUT, label: 'SYSTEM INFO', icon: Info },
          ].map((item: any, idx) => (
            <div key={idx} onClick={() => { setView(item.id); setOpen(false); }} 
              className={`flex items-center justify-between px-6 py-3 rounded-xl cursor-pointer transition-all ${currentView === item.id ? 'bg-orange-600 text-white font-black shadow-2xl scale-[1.03]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
               <div className="flex items-center gap-4">
                  <item.icon size={18} />
                  <span className="text-[11px] uppercase font-black tracking-widest">{item.label}</span>
               </div>
               <ChevronRight size={16} className={currentView === item.id ? 'opacity-60' : 'opacity-10'} />
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40 space-y-4 shrink-0">
           <div className="flex flex-col gap-2">
              <div className="bg-green-600/10 hover:bg-green-600 transition-all px-5 py-3 rounded-xl border border-green-500/20 flex items-center justify-center gap-3 group cursor-pointer shadow-xl active:scale-95">
                 <MessageSquare size={16} className="text-green-500 group-hover:text-white" />
                 <span className="text-[10px] font-black text-green-500 group-hover:text-white uppercase tracking-widest">WhatsApp</span>
              </div>
              <div className="bg-blue-600/10 hover:bg-blue-600 transition-all px-5 py-3 rounded-xl border border-blue-500/20 flex items-center justify-center gap-3 group cursor-pointer shadow-xl active:scale-95">
                 <Send size={16} className="text-blue-500 group-hover:text-white" />
                 <span className="text-[10px] font-black text-blue-500 group-hover:text-white uppercase tracking-widest">Telegram</span>
              </div>
           </div>
           <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center italic">Professional Gold License</p>
        </div>
      </aside>
    </>
  );
};

export const Header = ({ setSidebarOpen, setView, currentView, onShowHistory, addLog, setLogs, appState, loadAppState }: any) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportConfig = () => {
    try {
      const configString = JSON.stringify(appState, null, 2);
      triggerDownload(configString, 'ham_config.json', 'application/json');
      addLog('Configuration exported successfully.', 'success');
    } catch(e) {
      addLog('Failed to export configuration.', 'error');
    }
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsedState = JSON.parse(text);
          loadAppState(parsedState);
          addLog('Configuration imported successfully.', 'success');
        } catch (error) {
          addLog('Failed to parse configuration file.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const menuItems = [
    { label: 'Import Config', icon: FileText, action: handleImportClick },
    { label: 'Export Config', icon: HardDrive, action: handleExportConfig },
    { label: 'Renew Access', icon: RefreshCw, action: () => addLog('Access renewed for 30 days.', 'success') },
    { label: 'Server Apps', icon: Globe, action: () => setView(AppView.TOOLS) },
    { label: 'Clear System Logs', icon: Trash2, action: () => { setLogs([]); addLog('Logs Cleared', 'info'); if(setView) setView(AppView.LOGS); } },
    { label: 'Check Update', icon: SmartphoneNfc, action: () => alert('HAM Tunnel Pro v1.2\nQuantum Engine is up to date.') },
    { label: 'Quit Application', icon: LogOut, action: () => window.close() },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-16 px-6 py-1 flex justify-between items-center border-b border-white/5 bg-[#020617]/95 backdrop-blur-3xl z-[100] shadow-2xl">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
      <div className="flex items-center gap-4">
        <div className="p-3 hover:bg-white/5 rounded-2xl cursor-pointer transition-all active:scale-90" onClick={() => setSidebarOpen(true)}>
          <Menu className="text-orange-500" size={24} />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-[13px] uppercase tracking-[0.2em] text-white italic leading-none">HAM TUNNEL</span>
          <span className="text-[9px] font-black text-orange-500 uppercase mt-1 tracking-widest italic leading-none">Quantum v1.2</span>
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
         {currentView === AppView.HAMLI && (
           <button onClick={onShowHistory} className="p-3 hover:bg-white/5 rounded-2xl cursor-pointer text-slate-400 hover:text-orange-500 transition-all active:scale-90 shadow-inner">
             <History size={20} />
           </button>
         )}
         <button onClick={() => setView(AppView.SETTINGS)} className="p-3 hover:bg-white/5 rounded-2xl cursor-pointer text-slate-400 hover:text-orange-500 transition-all active:scale-90 shadow-inner">
            <Settings size={20} />
         </button>
         <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 hover:bg-white/5 rounded-2xl cursor-pointer text-slate-400 transition-all active:scale-90 shadow-inner">
            <MoreVertical size={20} />
         </button>

         {isMenuOpen && (
           <>
            <div className="fixed inset-0 z-[101]" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute top-full right-0 mt-3 w-64 glass-panel border border-white/10 rounded-[1.5rem] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.8)] z-[102] animate-in fade-in zoom-in-95 duration-300 origin-top-right">
              <div className="space-y-1">
                {menuItems.map((item, i) => (
                  <div key={i} onClick={() => { item.action(); setIsMenuOpen(false); }} className="flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-orange-500/10 cursor-pointer group transition-all">
                    <item.icon size={16} className="text-slate-500 group-hover:text-orange-500" />
                    <span className="text-[11px] font-black uppercase text-slate-400 group-hover:text-white tracking-widest leading-none">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
           </>
         )}
      </div>
    </header>
  );
};

export const Footer = ({ currentView, setView }: any) => {
  const tabs = [
    { id: AppView.HOME, icon: LayoutDashboard, label: 'HOME' },
    { id: AppView.HAMLI, icon: Sparkles, label: 'AI CHAT' },
    { id: AppView.LOGS, icon: Terminal, label: 'LOGS' }
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-24 glass-panel border-t border-white/5 px-10 pb-8 pt-4 flex justify-between z-50 items-center shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
      {tabs.map((tab) => (
        <div key={tab.id} onClick={() => setView(tab.id)} className={`flex flex-col items-center gap-2 transition-all cursor-pointer active:scale-95 ${currentView === tab.id ? 'text-orange-500' : 'text-slate-600 hover:text-slate-400'}`}>
          <div className={`p-4 rounded-xl transition-all duration-500 ${currentView === tab.id ? 'bg-orange-600 text-white shadow-[0_0_40px_rgba(234,88,12,0.4)]' : 'border border-transparent'}`}>
            <tab.icon size={24} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] italic leading-none">{tab.label}</span>
        </div>
      ))}
    </footer>
  );
};

export const SelectionModal = ({ active, setClose, data, onSelect, current }: any) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center px-4 pb-6">
      <div className="absolute inset-0 bg-black/95 transition-opacity duration-500 backdrop-blur-2xl" onClick={setClose} />
      <div className="relative w-full max-w-md bg-[#0f172a] rounded-[2.5rem] p-10 border-2 border-white/10 shadow-[0_50px_150px_rgba(0,0,0,1)] flex flex-col max-h-[75vh] animate-in slide-in-from-bottom-10 duration-700">
        <div className="flex justify-center mb-8">
           <div className="w-16 h-1.5 bg-white/10 rounded-full" />
        </div>
        <h2 className="text-[12px] font-black uppercase text-orange-500 tracking-[0.4em] mb-8 text-center border-b border-white/5 pb-6">
          Pilih {active === 'connMode' ? 'Mode Koneksi' : (active === 'server' ? 'Server Node' : 'Protocol')}
        </h2>
        <div className="overflow-y-auto space-y-3 custom-scrollbar flex-1 -mr-4 pr-4">
          {data.map((item: any, i: number) => {
            const label = typeof item === 'object' ? item.country || item.id : item;
            const subLabel = typeof item === 'object' ? item.latency + ' • ' + item.ip : null;
            const flag = typeof item === 'object' ? item.flag : null;
            const isSelected = typeof current === 'object' ? (typeof item === 'object' ? item.id === current?.id : false) : item === current;
            
            return (
              <div key={i} onClick={() => onSelect(item)} className={`px-6 py-5 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'bg-orange-600 border-orange-500 text-white shadow-2xl scale-105' : 'bg-black/40 border-white/5 text-slate-500 hover:bg-white/5'}`}>
                <div className="flex items-center gap-5">
                   {flag && <span className="text-3xl drop-shadow-lg">{flag}</span>}
                   <div className="flex flex-col">
                      <span className="text-[13px] font-black uppercase tracking-widest leading-none">{label}</span>
                      {subLabel && <span className={`text-[10px] font-bold leading-none mt-2 ${isSelected ? 'text-white/60' : 'text-slate-600'}`}>{subLabel}</span>}
                   </div>
                </div>
                {isSelected && <ShieldCheck size={24} />}
              </div>
            );
          })}
        </div>
        <button onClick={setClose} className="mt-8 py-5 w-full glass-panel rounded-xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white/5 transition-all text-slate-300">Batalkan</button>
      </div>
    </div>
  );
};

export const ChatHistoryPanel = ({ isOpen, setOpen, sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession }: any) => {
  const getRelativeTime = (timestamp: number) => {
    const now = new Date();
    const sessionDate = new Date(timestamp);
    const diffTime = now.getTime() - sessionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return sessionDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
  };

  const groupedSessions = sessions
    .filter((s: ChatSession) => s.messages.length > 0)
    .reduce((acc: { [key: string]: ChatSession[] }, session: ChatSession) => {
      const groupKey = getRelativeTime(session.timestamp);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(session);
      return acc;
    }, {});

  return (
    <>
      <div className={`fixed inset-0 z-[600] bg-black/80 transition-opacity duration-500 backdrop-blur-sm ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)} />
      <div className={`fixed top-0 left-0 h-full w-80 bg-[#0f172a] z-[601] transform transition-transform duration-500 border-r border-white/10 flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-black text-white uppercase tracking-wider">History</h2>
          <button onClick={onNewSession} className="flex items-center gap-2 p-3 bg-orange-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform shadow-lg">
            <PlusCircle size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {Object.keys(groupedSessions).length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600 text-center text-sm font-bold p-10">No saved chats yet.</div>
          ) : (
            Object.entries(groupedSessions).map(([group, sessionsInGroup]) => (
              <div key={group} className="mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase px-3 py-2">{group}</h3>
                <div className="space-y-2">
                  {(sessionsInGroup as ChatSession[]).map((session: ChatSession) => (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${activeSessionId === session.id ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}
                    >
                      <p className={`text-sm font-semibold truncate flex-1 ${activeSessionId === session.id ? 'text-orange-400' : 'text-slate-300'}`}>
                        {session.title}
                      </p>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }} className="p-2 rounded-full text-slate-600 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};