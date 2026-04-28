
export const appLogicTemplate = `
const App = () => {
    const { useState, useEffect, useRef } = React;
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('home');
    const [connState, setConnState] = useState('disconnected');
    const [logs, setLogs] = useState([]);
    
    // ... (rest of state definitions same as before) ...
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [aiPersona, setAiPersona] = useState('REZA');
    const [activeModal, setActiveModal] = useState(null); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedServer, setSelectedServer] = useState(serverList[0]);
    const [selectedPort, setSelectedPort] = useState(commonPorts[1]);
    const [sni, setSni] = useState('m.facebook.com');
    const [connTime, setConnTime] = useState(0);
    const [connMode, setConnMode] = useState(connModes[2]); 
    const [connSetup, setConnSetup] = useState(true);
    const [useRealmHost, setUseRealmHost] = useState(true); 
    const [useTcpPayload, setUseTcpPayload] = useState(false); 
    const [preserveSni, setPreserveSni] = useState(false);
    const [chatAttachments, setChatAttachments] = useState([]);
    const [settings, setSettings] = useState({
        sound: true, vibrate: true, theme: 'dark', baseTunnel: 'P2P - Stable',
        tlsVersion: 'TLS 1.3', forwardDns: true, useHttpProxy: false,
        udpForward: true, wakelock: true, autoReconnect: true, 
        compression: false, connectionRetry: true, primaryDns: '8.8.8.8',
        httpProxy: { host: '127.0.0.1', port: '8080' },
        overridePrimaryHost: false, primaryHost: '', primaryNameserver: '',
        qBits: 50, godModeUnlocked: true, stealthModeUnlocked: true
    });
    const [stats, setStats] = useState({ down: 0, up: 0, totalDown: 0, totalUp: 0 });

    const chatEndRef = useRef(null);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatLoading]);

    const addLog = (message, type = 'info') => {
        setLogs(prev => [{
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString([], { hour12: false }),
          message, type
        }, ...prev].slice(-50));
        if (window.AndroidBridge && typeof window.AndroidBridge.toast === 'function') {
            window.AndroidBridge.toast(message);
        }
    };

    // BRIDGE: EXPORT CONFIG
    const handleExportConfig = () => {
      const config = { settings, selectedServer, sni, connMode, selectedPort };
      const json = JSON.stringify(config);
      if (window.AndroidBridge && window.AndroidBridge.encryptAndSaveConfig) {
          window.AndroidBridge.encryptAndSaveConfig(json);
          addLog("Config Encrypted & Saved to /Documents/ham_config.hc", "success");
      } else {
          // Web Fallback
          const blob = new Blob([btoa(json)], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ham_config.hc';
          document.body.appendChild(a);
          a.click();
          addLog("Config Exported (Web Mode)", "success");
      }
    };

    // BRIDGE: IMPORT CONFIG
    const handleImportConfig = () => {
       if (window.AndroidBridge && window.AndroidBridge.decryptAndLoadConfig) {
           const json = window.AndroidBridge.decryptAndLoadConfig();
           if (json) {
               const data = JSON.parse(json);
               setSettings(s => ({...s, ...data.settings}));
               setSelectedServer(data.selectedServer);
               setSni(data.sni);
               addLog("Config Decrypted & Loaded Successfully", "success");
           } else {
               addLog("Failed to load/decrypt config", "error");
           }
       } else {
           addLog("Use File Input for Web Import", "warn");
       }
    };

    // START VPN (NATIVE)
    const handleToggle = () => {
        if (connState === 'disconnected') {
            setConnState('connecting');
            addLog("Starting Quantum VPN Service...", "info");
            
            // Send config to Native Service
            if (window.AndroidBridge && window.AndroidBridge.startVpnService) {
                const vpnConfig = {
                    remoteHost: selectedServer.ip,
                    sni: sni,
                    payload: "GET / HTTP/1.1\\r\\nHost: " + sni + "\\r\\n\\r\\n"
                };
                window.AndroidBridge.startVpnService(JSON.stringify(vpnConfig));
            }

            setTimeout(() => {
                setConnState('connected');
                addLog("VPN Connected (Tunnel Established)", "success");
            }, 2000);
        } else {
            setConnState('disconnected');
            addLog("VPN Disconnected", "warn");
        }
    };

    // ... (Existing Gemini/Chat logic remains same) ...
    // Simplified geminiService for offline build (placeholder)
    const offlineGeminiService = {
        getNetworkAdvice: async (message, history, persona, attachments) => {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return { text: "Offline Mode: Full AI requires internet.", sources: [] };
        }
    };

    const handleChat = async () => {
        if (!chatInput.trim()) return;
        const msgText = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: msgText, timestamp: Date.now() }]);
        setIsChatLoading(true);
        try {
            const res = await offlineGeminiService.getNetworkAdvice(msgText, [], aiPersona, []);
            setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: res.text, timestamp: Date.now() }]);
        } finally { setIsChatLoading(false); }
    };

    // ... (Render Logic) ...
    useEffect(() => { setTimeout(() => setLoading(false), 2000); }, []);

    if(loading) return <div className="loading-screen">LOADING QUANTUM ENGINE...</div>;

    return (
        <div className="h-screen w-full bg-[#020617] relative overflow-hidden flex flex-col">
            <Header setSidebarOpen={setIsSidebarOpen} setView={setView} addLog={addLog} setLogs={setLogs} onExport={handleExportConfig} onImport={handleImportConfig} />
            <Sidebar isOpen={isSidebarOpen} setOpen={setIsSidebarOpen} currentView={view} setView={setView} addLog={addLog} />
            <main className="absolute top-16 bottom-24 left-0 right-0 overflow-hidden bg-[#020617] border-t border-b border-white/5">
                <div className="h-full w-full overflow-y-auto no-scrollbar p-5">
                    {view === 'home' && <DashboardView connState={connState} stats={stats} connTime={connTime} handleToggle={handleToggle} selectedServer={selectedServer} openModal={setActiveModal} selectedPort={selectedPort} sni={sni} setSni={setSni} connMode={connMode} setConnMode={setConnMode} connSetup={connSetup} setConnSetup={setConnSetup} useRealmHost={useRealmHost} setUseRealmHost={setUseRealmHost} useTcpPayload={useTcpPayload} setUseTcpPayload={setUseTcpPayload} preserveSni={preserveSni} setPreserveSni={setPreserveSni} />}
                    {view === 'hamli' && <HAMLIView chatMessages={chatMessages} isChatLoading={isChatLoading} chatInput={chatInput} setChatInput={setChatInput} handleChat={handleChat} logEndRef={chatEndRef} aiPersona={aiPersona} handleFileSelect={()=>{}} chatAttachments={chatAttachments} removeAttachment={()=>{}} />}
                    {view === 'settings' && <SettingsView settings={settings} setSettings={setSettings} setView={setView} openModal={setActiveModal} resetSettings={()=>{}} />}
                    {view === 'payload_builder' && <PayloadView setView={setView} payload="" setPayload={()=>{}} bugHost="" setBugHost={()=>{}} method="GET" setMethod={()=>{}} payloadMethods={[]} />}
                    {view === 'tools' && <ToolsView setView={setView} />}
                    {view === 'export_aide' && <ExportAideView setView={setView} addLog={addLog} />}
                    {view === 'autorender' && <AutorenderView setView={setView} addLog={addLog} isUnlocked={true} setIsUnlocked={()=>{}} licenseConfig={{}} />}
                    {view === 'about' && <AboutView setView={setView} />}
                    {view === 'logs' && (
                        <div className="logs-view">
                          {logs.map(log => <div key={log.id}>{log.message}</div>)}
                        </div>
                    )}
                </div>
            </main>
            <Footer currentView={view} setView={setView} />
            <SelectionModal active={activeModal} setClose={() => setActiveModal(null)} data={activeModal === 'server' ? serverList : []} onSelect={setSelectedServer} current={selectedServer} />
        </div>
    );
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`
