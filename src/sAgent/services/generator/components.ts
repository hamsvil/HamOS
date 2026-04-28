export const componentsTemplate = `
// --- UI COMPONENTS ---

const Sidebar = ({ isOpen, setOpen, currentView, setView, addLog }) => {
  const [networkInfo, setNetworkInfo] = React.useState({ ip: '...', type: '...', card: '...' });

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setNetworkInfo({
          ip: '114.124.185.12',
          type: '4G / LTE+',
          card: 'TELKOMSEL / TSEL'
        });
      }, 500);
    }
  }, [isOpen]);

  return (
    <React.Fragment>
      <div className={\`fixed inset-0 z-[700] bg-black/98 transition-opacity duration-700 backdrop-blur-3xl \${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`} onClick={() => setOpen(false)} />
      <aside className={\`fixed top-0 left-0 h-full w-80 bg-[#020617] z-[701] transform transition-transform duration-700 border-r border-white/5 flex flex-col shadow-2xl \${isOpen ? 'translate-x-0' : '-translate-x-full'}\`}>
        <div className="p-10 bg-gradient-to-br from-orange-600 to-orange-800 text-white relative overflow-hidden shrink-0 shadow-2xl">
           <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12 scale-150"><Zap size={200} /></div>
           <div className="flex items-center gap-6 relative z-10">
              <div className="p-4 bg-black rounded-2xl border border-white/10 shadow-2xl"><Shield size={32} className="text-orange-500" /></div>
              <div>
                 <h2 className="font-black text-2xl uppercase italic tracking-tighter leading-none">{_T(S.APP)}</h2>
                 <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mt-2">Quantum Engine</p>
              </div>
           </div>
           
           <div className="mt-10 flex flex-col relative z-10 bg-black/20 p-5 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
              <div className="flex justify-between items-center mb-3">
                 <span className="text-[9px] font-black uppercase text-white/50 tracking-[0.2em]">Network ID</span>
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
                    <span className="text-[8px] font-black uppercase text-green-500 tracking-tighter">SECURED</span>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <Signal size={20} className="text-white/80" />
                 <span className="text-[18px] font-black uppercase tracking-tight text-white truncate">{networkInfo.card}</span>
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
                 <span className="text-[13px] font-mono font-black text-white/90">{networkInfo.ip}</span>
                 <span className="text-[11px] font-mono font-black text-white/50">{networkInfo.type}</span>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar mt-4">
          {[
            { id: 'home', label: 'DASHBOARD', icon: LayoutDashboard },
            { id: 'hamli', label: 'CHAT AI', icon: Sparkles },
            { id: 'payload_builder', label: _T(S.PAYLOAD), icon: Database },
            { id: 'autorender', label: _T(S.SOURCE), icon: Code },
            { id: 'export_aide', label: _T(S.EXPORTER), icon: HardDrive },
            { id: 'home', label: _T(S.IMPORTER), icon: FileText },
            { id: 'settings', label: _T(S.SETTING_LABEL), icon: Settings },
            { id: 'tools', label: _T(S.SERVER_APPS), icon: Globe },
            { id: 'about', label: _T(S.ABOUT), icon: Info },
            { id: 'home', label: _T(S.VOUCHER), icon: Gift },
          ].map((item, idx) => (
            <div key={idx} onClick={() => { 
              setView(item.id);
              setOpen(false); 
            }} 
              className={\`flex items-center justify-between px-8 py-5 rounded-xl cursor-pointer transition-all \${currentView === item.id ? 'bg-orange-600 text-white font-black shadow-2xl scale-[1.03]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}\`}>
               <div className="flex items-center gap-5">
                  <item.icon size={22} />
                  <span className="text-[13px] uppercase font-black tracking-widest">{item.label}</span>
               </div>
               <ChevronRight size={16} className={currentView === item.id ? 'opacity-60' : 'opacity-10'} />
            </div>
          ))}
        </div>

        <div className="p-8 border-t border-white/5 bg-black/40 space-y-4 shrink-0">
           <div className="flex flex-col gap-3">
              <a href="https://wa.me/6281545627312" target="_blank" className="bg-green-600/10 hover:bg-green-600 transition-all px-6 py-4 rounded-xl border border-green-500/20 flex items-center justify-center gap-4 group cursor-pointer shadow-xl active:scale-95">
                 <MessageSquare size={20} className="text-green-500 group-hover:text-white" />
                 <span className="text-[11px] font-black text-green-500 group-hover:text-white uppercase tracking-widest">WhatsApp</span>
              </a>
              <a href="https://t.me/6281545627312" target="_blank" className="bg-blue-600/10 hover:bg-blue-600 transition-all px-6 py-4 rounded-xl border border-blue-500/20 flex items-center justify-center gap-4 group cursor-pointer shadow-xl active:scale-95">
                 <Send size={20} className="text-blue-500 group-hover:text-white" />
                 <span className="text-[11px] font-black text-blue-500 group-hover:text-white uppercase tracking-widest">Telegram</span>
              </a>
           </div>
           <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center italic">Professional Gold License</p>
        </div>
      </aside>
    </React.Fragment>
  );
};

const Header = ({ setSidebarOpen, setView, addLog, setLogs }) => { 
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const menuItems = [
    { label: 'Import Config', icon: FileText, action: () => addLog('Config Imported', 'success') },
    { label: 'Export Config', icon: HardDrive, action: () => setView('export_aide') },
    { label: 'Renew Access', icon: RefreshCw, action: () => addLog('Access Renewed', 'success') },
    { label: 'Server Apps', icon: Globe, action: () => setView('tools') },
    { label: 'Clear System Logs', icon: Trash2, action: () => { setLogs([]); addLog('Logs Cleared', 'info'); setView('logs'); } },
    { label: 'Check Update', icon: SmartphoneNfc, action: () => addLog('System v1.2 is up to date', 'info') },
    { label: 'Quit Application', icon: LogOut, action: () => { if(window.confirm('Keluar Aplikasi?')) window.close(); } },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-16 px-6 py-1 flex justify-between items-center border-b border-white/5 bg-[#020617]/95 backdrop-blur-3xl z-[100] shadow-2xl">
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
         <div onClick={() => setView('settings')} className="p-3 hover:bg-white/5 rounded-2xl cursor-pointer text-slate-400 hover:text-orange-500 transition-all active:scale-90 shadow-inner">
            <Settings size={20} />
         </div>
         
         <div onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 hover:bg-white/5 rounded-2xl cursor-pointer text-slate-400 transition-all active:scale-90 shadow-inner">
            <MoreVertical size={20} />
         </div>

         {isMenuOpen && (
           <React.Fragment>
            <div className="fixed inset-0 z-[101]" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute top-full right-0 mt-3 w-64 glass-panel border border-white/10 rounded-[1.5rem] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.8)] z-[102] animate-in fade-in zoom-in-95 duration-300 origin-top-right">
              <div className="space-y-1">
                {menuItems.map((item, i) => (
                  <div key={i} onClick={() => { 
                    if(item.action) item.action(); 
                    setIsMenuOpen(false); 
                  }} className="flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-orange-500/10 cursor-pointer group transition-all">
                    <item.icon size={16} className="text-slate-500 group-hover:text-orange-500" />
                    <span className="text-[11px] font-black uppercase text-slate-400 group-hover:text-white tracking-widest leading-none">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
           </React.Fragment>
         )}
      </div>
    </header>
  );
};

const Footer = ({ currentView, setView }) => {
  const tabs = [
    { id: 'home', icon: LayoutDashboard, label: 'HOME' },
    { id: 'hamli', icon: Sparkles, label: 'CHAT AI' },
    { id: 'logs', icon: Terminal, label: 'LOGS' }
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-24 glass-panel border-t border-white/5 px-10 pb-8 pt-4 flex justify-between z-50 items-center shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
      {tabs.map((tab) => (
        <div key={tab.id} onClick={() => setView(tab.id)} className={\`flex flex-col items-center gap-2 transition-all cursor-pointer active:scale-95 \${currentView === tab.id ? 'text-orange-500' : 'text-slate-600 hover:text-slate-400'}\`}>
          <div className={\`p-4 rounded-xl transition-all duration-500 \${currentView === tab.id ? 'bg-orange-600 text-white shadow-[0_0_40px_rgba(234,88,12,0.4)]' : 'border border-transparent'}\`}>
            <tab.icon size={24} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] italic leading-none">{tab.label}</span>
        </div>
      ))}
    </footer>
  );
};

const SelectionModal = ({ active, setClose, data, onSelect, current }) => {
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
          {data.map((item, i) => {
            const label = typeof item === 'object' ? item.country || item.id : item;
            const subLabel = typeof item === 'object' ? item.latency + ' • ' + item.ip : null;
            const flag = typeof item === 'object' ? item.flag : null;
            // Handle different types for 'current' (object for server, string for port/connMode)
            const isSelected = (typeof current === 'object' && current !== null) ? (typeof item === 'object' ? item.id === current.id : false) : (item === current);

            return (
              <div key={i} onClick={() => onSelect(item)} className={\`px-6 py-5 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center \${isSelected ? 'bg-orange-600 border-orange-500 text-white shadow-2xl scale-105' : 'bg-black/40 border-white/5 text-slate-500 hover:bg-white/5'}\`}>
                <div className="flex items-center gap-5">
                   {flag && <span className="text-3xl drop-shadow-lg">{flag}</span>}
                   <div className="flex flex-col">
                      <span className="text-[13px] font-black uppercase tracking-widest leading-none">{label}</span>
                      {subLabel && <span className={\`text-[10px] font-bold leading-none mt-2 \${isSelected ? 'text-white/60' : 'text-slate-600'}\`}>{subLabel}</span>}
                   </div>
                </div>
                {isSelected && <div className="w-3 h-3 bg-slate-900 rounded-full animate-pulse" />}
              </div>
            );
          })}
        </div>
        <button onClick={setClose} className="mt-8 py-5 w-full glass-panel rounded-xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white/5 transition-all text-slate-300">Batalkan</button>
      </div>
    </div>
  );
};
`