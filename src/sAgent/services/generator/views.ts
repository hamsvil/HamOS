export const viewsTemplate = `
// --- PAGE VIEWS (SINKRONISASI LUCIVEO v1.2 - 3D EDITION) ---

const RenderMessage = ({ text, onMediaClick }) => {
  const parts = text.split(/\\\`\\\`\\\`/g);
  return (
    <div className="whitespace-pre-wrap select-text cursor-text">
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          const imgMatch = part.match(/!\\[Generated Image\\]\\((data:image\\/.*?;base64,.*?)\\)/);
          const videoMatch = part.match(/!\\[Generated Video\\]\\((.*?)\\)/);

          if (imgMatch) {
             const [before, after] = part.split(imgMatch[0]);
             return (
               <React.Fragment key={index}>
                 <span>{before}</span>
                 <div onClick={() => onMediaClick(imgMatch[1], 'image')} className="my-2 rounded-xl overflow-hidden border border-white/20 shadow-2xl cursor-pointer group relative">
                    <img src={imgMatch[1]} alt="Rendered" className="w-full object-cover transition-transform group-hover:scale-105 duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                       <Icon name="Maximize2" size={32} className="text-white drop-shadow-lg" />
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
                          <Icon name="Play" size={24} className="text-white fill-white ml-1" />
                       </div>
                    </div>
                 </div>
                 <span>{after}</span>
               </React.Fragment>
             );
          }
          return <span key={index}>{part}</span>;
        } else {
          const lines = part.split('\\n');
          const language = lines[0].trim();
          const code = lines.slice(1).join('\\n').replace(/\\n$/, ''); 
          return (
            <div key={index} className="my-2 rounded-lg overflow-hidden border border-white/10 bg-black/60 shadow-xl">
               <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5">
                  <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest">{language || 'CODE'}</span>
                  <Icon name="Copy" size={12} className="text-slate-500 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(code)} />
               </div>
               <pre className="p-4 text-[10px] font-mono text-slate-300 overflow-x-auto custom-scrollbar">{code}</pre>
            </div>
          );
        }
      })}
    </div>
  );
};

const HAMLIView = ({ 
  chatMessages, isChatLoading, chatInput, setChatInput, handleChat, logEndRef, aiPersona,
  handleFileSelect, chatAttachments, removeAttachment 
}) => {
  const isLucifer = aiPersona === 'HAMLI'; 
  const fileInputRef = React.useRef(null);
  const [viewer, setViewer] = React.useState(null);

  const suggestions = isLucifer ? [
    "Jebol Firewall ISP", "Rooting Network HAM", "Render Visual Hacker 3D", "Generate Script Bypass", "Panggil Reza (Asisten)"
  ] : [
    "Cek Status Server", "Cara Pakai SNI Bug", "Config Telkomsel Terbaru", "Payload WebSocket", "Panggil Hamli (Root)"
  ];

  return (
    <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-10 duration-700">
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 pb-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10">
            <div className="relative group">
               <div className={\`w-20 h-20 bg-gradient-to-br rounded-full flex items-center justify-center animate-pulse shadow-2xl transition-all duration-700 \${isLucifer ? 'from-red-600 to-black ring-4 ring-red-500/20' : 'from-orange-600 to-black ring-4 ring-orange-500/20'}\`}>
                  {isLucifer ? <Icon name="Cpu" size={40} className="text-white" /> : <Icon name="Sparkles" size={40} className="text-white" />}
               </div>
               <div className={\`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#060d17] animate-bounce \${isLucifer ? 'bg-red-500' : 'bg-blue-500'}\`} />
            </div>
            <div className="space-y-1">
               <h3 className={\`text-xl font-black uppercase tracking-tighter \${isLucifer ? 'text-red-500' : 'text-orange-500'}\`}>
                 {isLucifer ? 'HAMLI AUTHORITY' : 'REZA NETWORK AI'}
               </h3>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Quantum Kernel v1.2</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full px-10">
               {suggestions.map((s, i) => (
                 <div key={i} onClick={() => setChatInput(s)} className={\`px-4 py-3 glass-panel rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer transition-all border border-white/5 hover:border-orange-500/50 hover:bg-orange-500/5 hover:text-white active:scale-95 shadow-lg\`}>
                    {s}
                 </div>
               ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className={\`flex flex-col \${msg.role === 'user' ? 'items-end' : 'items-start'} w-full animate-in fade-in slide-in-from-bottom-2 duration-500\`}>
            <div className={\`max-w-[90%] p-4 rounded-2xl text-[10px] font-semibold leading-relaxed shadow-2xl \${
              msg.role === 'user' 
                ? (isLucifer ? 'bg-red-600 text-white rounded-tr-none' : 'bg-orange-600 text-slate-950 rounded-tr-none') 
                : (isLucifer ? 'bg-red-950/20 border border-red-500/20 text-red-100 rounded-tl-none w-full' : 'bg-[#1e293b] border border-white/10 text-slate-200 rounded-tl-none w-full')
            }\`}>
              {msg.attachments?.map((att, idx) => (
                <div key={idx} className="mb-3">
                  {att.mimeType.startsWith('image/') ? <img src={\`data:\${att.mimeType};base64,\${att.data}\`} className="w-32 rounded-lg border border-white/10 shadow-lg" alt="att" /> : <div className="flex items-center gap-2 text-[8px] bg-black/40 p-2 rounded-lg border border-white/5"><Icon name="FileText" size={12} /> {att.name}</div>}
                </div>
              ))}
              <RenderMessage text={msg.text} onMediaClick={(src, type) => setViewer({src, type})} />
            </div>
          </div>
        ))}
        {isChatLoading && (
           <div className={\`flex items-center gap-3 text-[10px] font-black uppercase animate-pulse pl-4 tracking-widest \${isLucifer ? 'text-red-500' : 'text-orange-500'}\`}>
              <div className="w-2 h-2 rounded-full bg-current animate-ping" />
              {isLucifer ? 'Hamli Generating Root Path...' : 'Reza is Analyzing...'}
           </div>
        )}
        <div ref={logEndRef} />
      </div>
      
      <div className="glass-panel rounded-[2rem] p-2 shrink-0 shadow-2xl relative border border-white/10">
        {chatAttachments?.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar p-2 bg-black/20 rounded-2xl">
            {chatAttachments.map((att, idx) => (
              <div key={idx} className="relative shrink-0 group">
                <div className="w-10 h-10 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center group-hover:border-orange-500 transition-all">
                  <Icon name="FileText" size={16} className="text-slate-500" />
                </div>
                <Icon name="X" size={10} className="absolute -top-1 -right-1 bg-red-600 rounded-full cursor-pointer p-0.5 text-white shadow-lg" onClick={() => removeAttachment(idx)} />
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-4 hover:bg-white/5 rounded-full text-slate-400 active:scale-90 transition-all">
            <Icon name="Paperclip" size={20} />
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
          </button>
          <input 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder={isLucifer ? "Ketik perintah Root..." : "Tanya tentang jaringan..."}
            className="flex-1 bg-transparent border-none text-[11px] font-bold text-white focus:outline-none placeholder:text-slate-600 py-4"
          />
          <button onClick={handleChat} className={\`p-4 rounded-full text-white shadow-2xl active:scale-95 transition-all \${isLucifer ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}\`}>
            <Icon name="Send" size={18} />
          </button>
        </div>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center p-6 border-b border-white/10 glass-panel">
            <button onClick={() => setViewer(null)} className="p-3 bg-white/5 rounded-2xl text-white active:scale-90 transition-all"><Icon name="ArrowLeft" size={24} /></button>
            <h3 className="text-[12px] font-black uppercase text-orange-500 tracking-[0.4em]">Quantum Media Vault</h3>
            <button className="p-3 bg-orange-600 rounded-2xl text-white active:scale-90 transition-all"><Icon name="Download" size={24} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
             {viewer.type === 'image' ? <img src={viewer.src} className="max-w-full max-h-full rounded-2xl shadow-2xl" /> : <video src={viewer.src} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />}
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardView = ({ 
  connState, stats, connTime, handleToggle, selectedServer, openModal, sni, setSni,
  selectedPort, connMode, setConnMode, connSetup, setConnSetup, 
  useRealmHost, setUseRealmHost, useTcpPayload, setUseTcpPayload, preserveSni, setPreserveSni
}) => {
  const [engineLoad, setEngineLoad] = React.useState(0);
  React.useEffect(() => {
    if (connState === 'connected') {
      const interval = setInterval(() => setEngineLoad(Math.floor(Math.random() * 20) + 30), 2000);
      return () => clearInterval(interval);
    } else setEngineLoad(0);
  }, [connState]);

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 animate-in fade-in duration-1000 overflow-visible">
      {/* 3D Visual Status Card */}
      <div className="floating-3d bg-[#0f172a]/90 rounded-[2rem] border border-white/10 p-6 flex flex-col items-center relative glass-panel min-h-[220px] shrink-0 overflow-hidden">
        <div className={\`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[120px] transition-all duration-1000 \${connState === 'connected' ? 'bg-green-500/30' : 'bg-orange-600/20'}\`} />
        
        <div className="w-full flex justify-between items-center mb-6 relative z-10 px-4">
           <div className="flex items-center gap-3">
              <div className={\`w-3 h-3 rounded-full \${connState === 'connected' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,1)] animate-pulse' : 'bg-slate-700'}\`} />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Quantum Node</span>
           </div>
           <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/10 flex items-center gap-2 shadow-inner">
              <Icon name="Activity" size={12} className={connState === 'connected' ? 'text-green-500 animate-pulse' : 'text-slate-600'} />
              <span className="text-[9px] font-black uppercase text-orange-500 tracking-wider">Load: {engineLoad}%</span>
           </div>
        </div>

        <div onClick={handleToggle} className={\`w-full max-w-[280px] h-16 rounded-full border-2 flex items-center justify-between px-8 cursor-pointer transition-all duration-700 relative z-10 active:scale-95 shadow-2xl \${connState === 'connected' ? 'border-green-400/50 bg-green-500/10 shadow-[0_0_60px_rgba(34,197,94,0.3)]' : 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/60'}\`}>
          <Icon name="Zap" size={24} className={connState === 'connected' ? 'text-green-400' : 'text-slate-500'} />
          <span className={\`text-[15px] font-black uppercase tracking-[0.4em] transition-all duration-700 italic \${connState === 'connected' ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'text-slate-400'}\`}>
             {connState === 'connected' ? 'SECURED' : connState === 'connecting' ? 'SYNCING' : 'CONNECT'}
          </span>
          <Icon name="Shield" size={24} className={connState === 'connected' ? 'text-green-400' : 'text-slate-500'} />
        </div>

        <div className="w-full grid grid-cols-2 gap-4 mt-8 relative z-10 px-2">
           <div className="bg-black/60 rounded-2xl p-5 border border-white/5 flex flex-col items-center shadow-inner">
              <div className="flex items-center gap-2 mb-2"><Icon name="ArrowDownCircle" size={14} className="text-green-500" /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Download</span></div>
              <span className="text-lg font-mono font-black text-white leading-none">\${stats?.down} <span className="text-[9px] opacity-30 uppercase">KB/s</span></span>
              <span className="text-[8px] font-bold text-slate-600 mt-2 uppercase tracking-tighter">TOTAL: \${stats?.totalDown.toFixed(2)} MB</span>
           </div>
           <div className="bg-black/60 rounded-2xl p-5 border border-white/5 flex flex-col items-center shadow-inner">
              <div className="flex items-center gap-2 mb-2"><Icon name="ArrowUpCircle" size={14} className="text-orange-500" /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Upload</span></div>
              <span className="text-lg font-mono font-black text-white leading-none">\${stats?.up} <span className="text-[9px] opacity-30 uppercase">KB/s</span></span>
              <span className="text-[8px] font-bold text-slate-600 mt-2 uppercase tracking-tighter">TOTAL: \${stats?.totalUp.toFixed(2)} MB</span>
           </div>
        </div>

        {/* TIME SESSION - ALWAYS VISIBLE */}
        <div className="mt-6 relative z-10 w-full flex flex-col items-center">
           <div className="flex flex-col items-center bg-white/5 px-10 py-3 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md">
              <h2 className="text-3xl font-mono font-black text-white tracking-tighter leading-none">
                {new Date(connTime * 1000).toISOString().substr(11, 8)}
              </h2>
              <span className={\`text-[8px] font-black uppercase tracking-[0.5em] mt-2 \${connState === 'connected' ? 'text-orange-500' : 'text-slate-600'}\`}>
                {connState === 'connected' ? 'Active Session' : 'Ready to Connect'}
              </span>
           </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 w-full shrink-0">
          <div className="glass-panel border border-white/10 px-5 py-5 rounded-2xl flex items-center gap-4 cursor-pointer shadow-xl active:scale-95 group transition-all" onClick={() => openModal('server')}>
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 group-hover:bg-orange-500 transition-all duration-500"><Icon name="Globe" size={24} className="text-orange-500 group-hover:text-slate-950" /></div>
            <div className="flex flex-col overflow-hidden"><span className="text-[8px] font-black text-slate-500 uppercase leading-none mb-2 tracking-widest">Location</span><span className="text-[12px] font-black text-white uppercase truncate w-24 leading-none tracking-tighter">\${selectedServer.country}</span></div>
          </div>
          <div className="glass-panel border border-white/10 px-5 py-5 rounded-2xl flex items-center gap-4 cursor-pointer shadow-xl active:scale-95 group transition-all" onClick={() => openModal('port')}>
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 group-hover:bg-orange-500 transition-all duration-500"><Icon name="Network" size={24} className="text-orange-500 group-hover:text-slate-950" /></div>
            <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase leading-none mb-2 tracking-widest">Port</span><span className="text-[15px] font-black text-white uppercase leading-none tracking-widest">\${selectedPort}</span></div>
          </div>
      </div>

      {/* Engine Core Section */}
      <div className={\`glass-panel border border-white/10 p-8 rounded-[2rem] space-y-8 shadow-2xl transition-all w-full shrink-0 relative overflow-hidden \${!connSetup ? 'opacity-50 grayscale pointer-events-none' : ''}\`}>
           <div className="flex justify-between items-center pb-4 border-b border-white/10 relative z-10">
              <span className="text-[12px] font-black text-slate-200 uppercase tracking-[0.3em]">Engine Core</span>
              <div onClick={() => setConnSetup(!connSetup)} className={\`w-14 h-7 rounded-full relative transition-all cursor-pointer shadow-inner \${connSetup ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-slate-800'}\`}>
                 <div className={\`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-500 \${connSetup ? 'translate-x-7' : 'translate-x-0'} shadow-lg\`} />
              </div>
           </div>
           
           <div className="relative z-10">
              <button disabled={!connSetup} onClick={() => openModal('connMode')} className={\`w-full px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-between border-2 \${connSetup ? 'bg-orange-600 border-orange-500 text-white scale-100' : 'bg-white/5 border-white/5 text-slate-500'}\`}>
                <span className="truncate">\${connMode}</span>
                <Icon name="ChevronRight" size={18} className="opacity-80" />
              </button>
           </div>

           <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center px-2">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Connection Host (SNI)</label>
                 <div className="flex gap-4">
                   <Icon name="Copy" size={18} className="text-slate-600 hover:text-orange-500 cursor-pointer transition-all active:scale-90" onClick={() => setSni(bypassUrls[Math.floor(Math.random()*bypassUrls.length)])} />
                   <Icon name="RefreshCw" size={18} className="text-slate-600 hover:text-orange-500 cursor-pointer transition-all active:scale-90" onClick={() => setSni('')} />
                 </div>
              </div>
              <input list="bypass-urls-dash" disabled={!connSetup} value={sni} onChange={(e) => setSni(e.target.value)} className="w-full bg-black/60 border-2 border-white/10 p-5 rounded-2xl text-[14px] font-bold text-orange-500 focus:outline-none focus:border-orange-500 shadow-inner" placeholder="m.facebook.com" />
              <datalist id="bypass-urls-dash">{bypassUrls.map(u => <option key={u} value={u} />)}</datalist>
           </div>
           
           <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                 <span className="text-[10px] font-black text-slate-400 uppercase italic">Realm V2</span>
                 <div onClick={() => connSetup && setUseRealmHost(!useRealmHost)} className={\`w-10 h-5 rounded-full relative transition-all cursor-pointer \${useRealmHost ? 'bg-orange-500 shadow-lg' : 'bg-slate-800'}\`}>
                    <div className={\`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 \${useRealmHost ? 'translate-x-5' : 'translate-x-0'}\`} />
                 </div>
              </div>
              <div className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                 <span className="text-[10px] font-black text-slate-400 uppercase italic">TCP Payload</span>
                 <div onClick={() => connSetup && setUseTcpPayload(!useTcpPayload)} className={\`w-10 h-5 rounded-full relative transition-all cursor-pointer \${useTcpPayload ? 'bg-orange-500 shadow-lg' : 'bg-slate-800'}\`}>
                    <div className={\`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 \${useTcpPayload ? 'translate-x-5' : 'translate-x-0'}\`} />
                 </div>
              </div>
              <div className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 col-span-2 shadow-inner">
                 <span className="text-[10px] font-black text-slate-400 uppercase italic">Preserve SNI</span>
                 <div onClick={() => connSetup && setPreserveSni(!preserveSni)} className={\`w-12 h-6 rounded-full relative transition-all cursor-pointer \${preserveSni ? 'bg-orange-500 shadow-lg' : 'bg-slate-800'}\`}>
                    <div className={\`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 \${preserveSni ? 'translate-x-6' : 'translate-x-0'}\`} />
                 </div>
              </div>
           </div>
      </div>
    </div>
  );
};

export const SettingsView = ({ settings, setSettings, setView, openModal, resetSettings }) => {
  const toggleSetting = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const SettingToggle = ({ label, desc, icon: IconName, value, onToggle }) => (
    <div className="flex items-center justify-between p-5 glass-panel border border-white/5 rounded-2xl hover:bg-white/5 transition-all group">
      <div className="flex items-center gap-5">
        <div className="p-4 bg-orange-500/10 rounded-xl text-orange-500 shadow-inner group-hover:bg-orange-500 group-hover:text-slate-950 transition-all duration-500"><Icon name={IconName} size={20} /></div>
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-white uppercase tracking-widest">{label}</span>
          <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">{desc}</span>
        </div>
      </div>
      <div onClick={onToggle} className={\`w-12 h-6 rounded-full relative transition-all cursor-pointer \${value ? 'bg-orange-500 shadow-lg' : 'bg-slate-800'}\`}>
        <div className={\`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 \${value ? 'translate-x-6' : 'translate-x-0'}\`} />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 pb-6">
      <div className="flex items-center gap-4" onClick={() => setView('home')}>
        <div className="p-3 glass-panel rounded-2xl cursor-pointer"><Icon name="ArrowLeft" size={18} /></div>
        <h2 className="text-[12px] font-black uppercase text-white tracking-[0.3em]">System Engine</h2>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-2">
        <div className="glass-panel border border-white/5 rounded-[2rem] p-6 space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4 px-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em] italic">General Preferences</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          
          <SettingToggle label="Sound Feedback" desc="Sfx On Action" icon="Volume2" value={settings.sound} onToggle={() => toggleSetting('sound')} />
          <SettingToggle label="Haptic Engine" desc="Touch Vibrations" icon="Vibrate" value={settings.vibrate} onToggle={() => toggleSetting('vibrate')} />
          
          <div className="flex items-center gap-4 my-8 px-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em] italic">Network Core</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <SettingToggle label="Auto Reconnect" desc="Keep Persistence" icon="Repeat" value={settings.connectionRetry} onToggle={() => toggleSetting('connectionRetry')} />
          <SettingToggle label="DNS Forwarding" desc="Secure Query" icon="Globe" value={settings.forwardDns} onToggle={() => toggleSetting('forwardDns')} />
          
          <div className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-3">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Global DNS Resolver</span>
            <input value={settings.primaryDns} onChange={(e) => updateSetting('primaryDns', e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-[11px] font-mono text-orange-500 focus:outline-none" placeholder="8.8.8.8" />
          </div>

          <SettingToggle label="HTTP Proxy" desc="Connect through gateway" icon="Server" value={settings.useHttpProxy} onToggle={() => toggleSetting('useHttpProxy')} />
          
          <SettingToggle label="Override Primary Host" desc="Manual Host Routing" icon="ShieldAlert" value={settings.overridePrimaryHost} onToggle={() => toggleSetting('overridePrimaryHost')} />

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:border-orange-500/50 transition-all" onClick={() => openModal('tunnel')}>
              <span className="block text-[8px] font-black text-slate-500 uppercase mb-2 tracking-widest">Protocol</span>
              <span className="text-[11px] font-black text-orange-500 uppercase">\${settings.baseTunnel}</span>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:border-orange-500/50 transition-all" onClick={() => openModal('tls')}>
              <span className="block text-[8px] font-black text-slate-500 uppercase mb-2 tracking-widest">TLS Layer</span>
              <span className="text-[11px] font-black text-orange-500 uppercase">\${settings.tlsVersion}</span>
            </div>
          </div>

          <button onClick={resetSettings} className="w-full mt-10 py-5 bg-red-600/10 border border-red-500/20 rounded-2xl text-[11px] font-black text-red-500 uppercase tracking-[0.3em] active:scale-95 shadow-2xl transition-all hover:bg-red-600 hover:text-white">Wipe All Configs</button>
        </div>
      </div>
    </div>
  );
};

export const PayloadView = ({ setView, payload, setPayload, bugHost, setBugHost, method, setMethod, payloadMethods }) => (
  <div className="h-full flex flex-col space-y-6 pb-6 animate-in fade-in duration-700">
    <div className="flex items-center gap-4" onClick={() => setView('home')}>
      <div className="p-3 glass-panel rounded-2xl cursor-pointer"><Icon name="ArrowLeft" size={18} /></div>
      <h2 className="text-[12px] font-black uppercase text-white tracking-[0.3em]">Payload Builder</h2>
    </div>
    <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
       <div className="glass-panel border border-white/10 rounded-[2rem] p-8 space-y-6 shadow-2xl">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Target Host</label>
            <input value={bugHost} onChange={(e) => setBugHost(e.target.value)} className="w-full bg-black/60 border-2 border-white/10 p-5 rounded-2xl text-orange-500 text-[14px] font-bold focus:outline-none" placeholder="example.com" />
          </div>
          <div className="flex flex-wrap gap-2">
             {payloadMethods.map((m) => (
               <button key={m} onClick={() => setMethod(m)} className={\`px-5 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all shadow-lg \${method === m ? 'bg-orange-500 text-slate-950 scale-105' : 'bg-white/5 text-slate-500 border border-white/5'}\`}>\${m}</button>
             ))}
          </div>
       </div>
       <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-6">Result Bytecode</label>
          <textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="w-full bg-[#0f172a] border border-white/10 p-6 rounded-[2rem] text-[11px] font-mono text-slate-400 h-64 focus:outline-none shadow-2xl leading-relaxed custom-scrollbar" />
       </div>
    </div>
  </div>
);

export const ToolsView = ({ setView }) => {
  const tools = [
    { title: 'DNS Optimizer', icon: 'Globe', desc: 'Ultra Fast Queries' },
    { title: 'IP Identity', icon: 'Smartphone', desc: 'Detect Interface' },
    { title: 'Host Finder', icon: 'Search', desc: 'Find Vulnerable Bugs' },
    { title: 'Quantum Ping', icon: 'Gauge', desc: 'Verify Latency' },
    { title: 'Split Tunnel', icon: 'Layers', desc: 'App Management' },
    { title: 'Logs Cleaner', icon: 'Trash2', desc: 'System Purge' }
  ];
  return (
    <div className="h-full flex flex-col space-y-6 pb-6">
      <div className="flex items-center gap-4" onClick={() => setView('home')}>
        <div className="p-3 glass-panel rounded-2xl cursor-pointer"><Icon name="ArrowLeft" size={18} /></div>
        <h2 className="text-[12px] font-black uppercase text-white tracking-[0.3em]">Quantum Tools</h2>
      </div>
      <div className="grid grid-cols-2 gap-5 overflow-y-auto no-scrollbar flex-1 pb-2">
        {tools.map((t, i) => (
          <div key={i} className="glass-panel border border-white/10 p-8 rounded-[2rem] flex flex-col items-center text-center space-y-4 group hover:border-orange-500/50 transition-all cursor-pointer shadow-2xl active:scale-95">
            <div className="p-5 bg-orange-500/10 rounded-2xl text-orange-500 group-hover:bg-orange-500 group-hover:text-slate-950 transition-all duration-700 shadow-inner">
               <Icon name={t.icon} size={28} />
            </div>
            <div className="space-y-1">
               <h3 className="text-[11px] font-black text-white uppercase tracking-widest">\${t.title}</h3>
               <p className="text-[8px] text-slate-600 font-bold uppercase">\${t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ExportAideView = ({ setView, addLog }) => {
  const [isBuilding, setIsBuilding] = React.useState(false);
  const [buildProgress, setBuildProgress] = React.useState(0);
  const [buildLogs, setBuildLogs] = React.useState([]);
  const logRef = React.useRef(null);
  const logs = ["> Initializing Compiler...", "> Fetching Secure Kernel v1.2...", "> Injecting Bypass Module...", "> Optimizing APK...", "> Finalizing Build...", "> ham_quantum_pro.apk ready!"];

  const handleStartBuild = () => {
    setIsBuilding(true); setBuildProgress(0); setBuildLogs([]);
    let step = 0;
    const interval = setInterval(() => {
      if (step < logs.length) {
        setBuildLogs((prev) => [...prev, logs[step]]);
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
    <div className="h-full flex flex-col space-y-6 pb-6">
      <div className="flex items-center gap-4" onClick={() => setView('home')}>
        <div className="p-3 glass-panel rounded-2xl cursor-pointer"><Icon name="ArrowLeft" size={18} /></div>
        <h2 className="text-[12px] font-black uppercase text-white tracking-[0.3em]">Project Exporter</h2>
      </div>
      <div className="glass-panel border border-white/10 rounded-[2rem] p-10 flex-1 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden">
         {!isBuilding && buildProgress === 0 ? (
           <div className="space-y-10">
              <div className="w-24 h-24 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 shadow-inner"><Icon name="Box" size={48} /></div>
              <div className="space-y-2">
                 <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Ready to Build?</h3>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Generate APK Source for Android Studio / AIDE</p>
              </div>
              <button onClick={handleStartBuild} className="w-full py-5 bg-orange-600 text-white font-black text-[12px] uppercase tracking-[0.3em] rounded-2xl shadow-2xl active:scale-95 transition-all">Compile Project</button>
           </div>
         ) : (
           <div className="w-full space-y-8">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full border-8 border-white/5 border-t-orange-500 animate-spin mx-auto" />
                <span className="absolute inset-0 flex items-center justify-center text-lg font-mono font-black text-white">\${Math.round(buildProgress)}%</span>
              </div>
              <div ref={logRef} className="bg-black/90 rounded-2xl p-6 h-64 overflow-y-auto font-mono text-[10px] text-green-500 border border-white/10 shadow-inner text-left custom-scrollbar">
                 {buildLogs.map((log, i) => <div key={i} className="mb-2 leading-relaxed">\${log}</div>)}
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

export const AboutView = ({ setView }) => (
  <div className="h-full flex flex-col space-y-6 pb-6">
    <div className="flex items-center gap-4" onClick={() => setView('home')}>
      <div className="p-3 glass-panel rounded-2xl cursor-pointer"><Icon name="ArrowLeft" size={18} /></div>
      <h2 className="text-[12px] font-black uppercase text-white tracking-[0.3em]">System Info</h2>
    </div>
    <div className="glass-panel border border-white/10 rounded-[2rem] p-10 space-y-10 shadow-2xl overflow-y-auto custom-scrollbar flex-1 relative">
       <div className="absolute top-20 right-10 opacity-5 -rotate-12"><Icon name="Zap" size={200} /></div>
       <div className="text-center space-y-4">
          <div className="inline-block p-6 bg-orange-500 rounded-2xl text-slate-950 shadow-2xl mb-4"><Icon name="Zap" size={48} /></div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">HAM TUNNEL PRO</h1>
          <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.4em]">Quantum Edition v1.2</p>
       </div>
       <div className="space-y-8 relative z-10">
          <div className="space-y-3">
             <h3 className="text-[14px] font-black text-white uppercase border-l-4 border-orange-500 pl-4">Tentang Software</h3>
             <p className="text-[11px] text-slate-400 font-semibold leading-relaxed uppercase">
                Aplikasi ini dikembangkan untuk stabilitas bypass jaringan di Indonesia. Menggunakan engine quantum terbaru yang memungkinkan latensi rendah dan enkripsi maksimal.
             </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
             {[
               { label: 'Enkripsi', value: 'Quantum SSL/TLS 1.3' },
               { label: 'Kernel', value: 'QUANTUM FLASH PRO' },
               { label: 'Developer', value: 'HAM Authority' },
               { label: 'Build Status', value: 'Professional Gold' }
             ].map((item, i) => (
               <div key={i} className="flex justify-between items-center px-6 py-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter">{item.value}</span>
               </div>
             ))}
          </div>
       </div>
    </div>
  </div>
);

export const AutorenderView = ({ setView, addLog, isUnlocked, setIsUnlocked, licenseConfig }) => {
  const [password, setPassword] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('xml');

  const sourceCode = {
    manifest: \`<?xml version="1.0" encoding="utf-8"?>\\n<manifest package="com.ham.quantum.pro">...\`,
    layout: \`<RelativeLayout xmlns:android="...">\\n    <WebView id="@+id/webView" ... />\\n</RelativeLayout>\`,
    java: \`package com.ham.quantum.pro;\\npublic class MainActivity extends Activity { ... }\`,
    service: \`public class QuantumVpnService extends VpnService { ... }\`
  };
  
  if (!isUnlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-10">
        <div className="p-10 glass-panel border border-orange-500/20 rounded-[2.5rem] shadow-2xl flex flex-col items-center space-y-8 text-center w-full max-w-[360px] floating-3d relative">
          <div className="p-6 bg-orange-500/10 rounded-2xl text-orange-500 shadow-inner"><Icon name="Lock" size={48} /></div>
          <div className="space-y-2">
             <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Secure Vault</h2>
             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Enter Auth Key to View Deep Kernel Source</p>
          </div>
          <div className="relative w-full">
            <input 
              type={showPass ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="System Code" 
              className="w-full bg-black/60 border-2 border-white/10 p-5 rounded-2xl text-center text-orange-500 text-lg font-bold focus:outline-none shadow-inner" 
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500" onClick={() => setShowPass(!showPass)}>
              {showPass ? <Icon name="EyeOff" size={18} /> : <Icon name="Eye" size={18} />}
            </div>
          </div>
          <button onClick={() => password === 'dasopano21' ? setIsUnlocked(true) : alert('Wrong Code')} className="w-full py-5 bg-orange-600 text-white font-black text-[12px] uppercase tracking-[0.3em] rounded-2xl shadow-2xl active:scale-95 transition-all">Access Source</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 pb-6">
      <div className="flex items-center justify-between" onClick={() => setView('home')}>
        <div className="p-3 glass-panel rounded-2xl cursor-pointer"><Icon name="ArrowLeft" size={18} /></div>
        <h2 className="text-[12px] font-black uppercase text-white tracking-[0.3em]">Kernel Source</h2>
      </div>
      <div className="glass-panel border border-white/5 rounded-[2rem] p-6 flex-1 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {['xml', 'layout', 'java', 'service'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={\`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all shrink-0 shadow-lg \${activeTab === tab ? 'bg-orange-600 text-white scale-105' : 'bg-white/5 text-slate-500 border border-white/5'}\`}>\${tab.toUpperCase()}</button>
          ))}
        </div>
        <div className="flex-1 bg-black/80 rounded-[2rem] p-8 border border-white/10 overflow-hidden flex flex-col shadow-inner">
           <div className="flex-1 overflow-auto custom-scrollbar no-scrollbar">
             <pre className="text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre select-text">\${(sourceCode)[activeTab]}</pre>
           </div>
        </div>
      </div>
    </div>
  );
};
`