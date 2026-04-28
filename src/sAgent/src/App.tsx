import React, { useState, useEffect, useRef } from "react";
import { Trash2, Shield, DownloadCloud } from "lucide-react";
import {
  AppView,
  ConnectionState,
  VPNServer,
  LogEntry,
  ChatMessage,
  AppSettings,
  Attachment,
  ChatSession,
  LocalBrainState,
} from "./types";
import { geminiService } from "../services/geminiService";
import { memoryService } from "../services/memoryService";
import { localLlmService } from "../services/localLlmService";
import { quantumBridge } from "../services/quantumBridge"; // IMPORT BRIDGE FOR AUTOSTART
import {
  serverList,
  commonPorts,
  payloadMethods,
  baseTunnelOptions,
  tlsVersions,
  connModes,
} from "./AppData";
import {
  Header,
  Sidebar,
  Footer,
  SelectionModal,
  ChatHistoryPanel,
} from "./components/UIComponents";
import {
  DashboardView,
  SettingsView,
  PayloadView,
  ToolsView,
  HAMLIView,
  ExportAideView,
  AboutView,
  AutorenderView,
  QuantumMiningView,
  VirtualRoomView,
  MemoryInjectionView,
  SovereignGatewayView,
  RandomizeToolView,
} from "./Views";

const STORAGE_KEY = "HAM_QUANTUM_V1.2_DATA";
const SESSIONS_STORAGE_KEY = "HAM_CHAT_SESSIONS_V2";
const MEMORY_VERSION_TAG = "HAM_MEMORY_V2_REBOOT";

const Splash = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(timer);
        setTimeout(onComplete, 500);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col items-center justify-center p-12 overflow-hidden">
      <div className="relative mb-12 animate-quantum">
        <Shield size={120} className="text-orange-500" strokeWidth={1.5} />
        <div className="absolute inset-0 flex items-center justify-center font-black text-4xl italic text-white drop-shadow-[0_0_20px_rgba(255,140,0,0.8)]">
          H
        </div>
        <div className="absolute -inset-8 border-4 border-orange-500/20 rounded-full animate-ping" />
      </div>
      <h1 className="text-3xl font-black italic tracking-tighter text-white mb-3 uppercase text-center drop-shadow-2xl">
        LISA QUANTUM v1.2
      </h1>
      <p className="text-[10px] font-black text-orange-500/80 uppercase tracking-[0.5em] italic mb-16">
        Powered by LISA Core
      </p>
      <div className="w-full max-w-[240px] h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner relative">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  vibrate: true,
  theme: "dark",
  baseTunnel: "P2P - Stable",
  tlsVersion: "TLS 1.3",
  forwardDns: true,
  useHttpProxy: false,
  udpForward: true,
  wakelock: true,
  autoReconnect: true,
  compression: false,
  connectionRetry: true,
  primaryDns: "8.8.8.8",
  httpProxy: { host: "127.0.0.1", port: "8080" },
  overridePrimaryHost: false,
  primaryHost: "",
  primaryNameserver: "8.8.8.8",
  useLocalBrain: false,
  localModelName: "",
  localModelThreads: 4,
  useCustomHost: false,
  customBaseUrl: "",
  customApiKey: "",
  customModelName: "",
  qBits: 50,
  godModeUnlocked: true,
  stealthModeUnlocked: true,
  autoStartMining: true, // DEFAULT TRUE: AUTOSTART ON
  keysSynced: false,
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY || "",
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
  ghostMode: true,
  polymorphicLevel: 3,
  twilioSid: "",
  twilioToken: "",
  xenditKey: "",
  gopayPhoneNumber: "",
  danaPhoneNumber: "",
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [connState, setConnState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED,
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "server" | "port" | "tunnel" | "tls" | "connMode" | null
  >(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [aiPersona, setAiPersona] = useState<"LISA" | "REZA" | "OMBEH">("LISA");
  const [selectedServer, setSelectedServer] = useState<VPNServer>(
    serverList[0],
  );
  const [selectedPort, setSelectedPort] = useState(commonPorts[1]);
  const [sni, setSni] = useState("m.facebook.com");
  const [bugHost, setBugHost] = useState("m.facebook.com");
  const [payload, setPayload] = useState(
    "GET / HTTP/1.1[crlf]Host: [host][crlf]Connection: Keep-Alive[crlf][crlf]",
  );
  const [method, setMethod] = useState("GET");
  const [connTime, setConnTime] = useState(0);
  const [connMode, setConnMode] = useState(connModes[2]);
  const [connSetup, setConnSetup] = useState(true);
  const [useRealmHost, setUseRealmHost] = useState(true);
  const [useTcpPayload, setUseTcpPayload] = useState(false);
  const [preserveSni, setPreserveSni] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState({
    down: 0,
    up: 0,
    totalDown: 0,
    totalUp: 0,
  });
  const [chatAttachments, setChatAttachments] = useState<Attachment[]>([]);
  const [engineInfo, setEngineInfo] = useState({});
  const [networkProfile, setNetworkProfile] = useState<any>({
    ip: "Scanning...",
    isp: "Scanning...",
    type: "Scanning...",
  });
  const [engineLoad, setEngineLoad] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const [localBrainState, setLocalBrainState] = useState<LocalBrainState>({
    isLoaded: false,
    isLoading: false,
    progress: 0,
    progressText: "Ready to Initialize",
  });

  const timerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  const activeChatMessages =
    sessions.find((s) => s.id === activeSessionId)?.messages || [];

  const triggerFeedback = () => {
    if (settings.sound) {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      const audioCtx = audioCtxRef.current;
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioCtx.currentTime + 0.1,
      );
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    }
    if (settings.vibrate && navigator.vibrate) navigator.vibrate(50);
  };

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) =>
      [
        {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString([], { hour12: false }),
          message,
          type,
        },
        ...prev,
      ].slice(-50),
    );
  };

  // --- AUTO START MINING LOGIC ---
  useEffect(() => {
    if (settings.autoStartMining && !loading) {
      addLog("AUTO-START: Initializing Hybrid Quantum Mining...", "warn");
      setTimeout(() => {
        quantumBridge.startMining();
        addLog("AUTO-START: Mining Engine Online & Backgrounded.", "success");
      }, 1500);
    }
  }, [loading, settings.autoStartMining]);

  // --- BACKGROUND PERSISTENCE (WAKE LOCK) ---
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request(
            "screen",
          );
          addLog(
            "Background Service: Wake Lock Acquired (Preventing Sleep)",
            "info",
          );
        }
      } catch (err: any) {
        // Silently fail or log
      }
    };

    if (settings.wakelock) {
      requestWakeLock();
      document.addEventListener("visibilitychange", async () => {
        if (
          wakeLockRef.current !== null &&
          document.visibilityState === "visible"
        ) {
          requestWakeLock();
        }
      });
    }
    return () => {
      if (wakeLockRef.current) wakeLockRef.current.release();
    };
  }, [settings.wakelock]);

  // --- MEMORY & SETTINGS INITIALIZATION ---
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const res = await fetch("https://ipinfo.io/json");
        if (!res.ok) {
          throw new Error(`Network API responded with status: ${res.status}`);
        }
        const data = await res.json();
        setNetworkProfile({
          ip: data.ip,
          isp: data.org || "Unknown ISP",
          type: "N/A",
        });
      } catch (e: any) {
        console.error("Failed to fetch network info:", e.message);
        setNetworkProfile({
          ip: "Error",
          isp: "Network Scan Failed",
          type: "N/A",
        });
      }
    };

    fetchNetworkInfo();
    setEngineInfo(geminiService.getTokenStatus());

    const saved = localStorage.getItem(STORAGE_KEY);
    let finalSettings = DEFAULT_SETTINGS;
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        if (parsedState.settings) {
          finalSettings = { ...DEFAULT_SETTINGS, ...parsedState.settings };
        }
        if (parsedState.selectedServer)
          setSelectedServer(parsedState.selectedServer);
        if (parsedState.selectedPort) setSelectedPort(parsedState.selectedPort);
        if (parsedState.sni) setSni(parsedState.sni);
        if (parsedState.connMode) setConnMode(parsedState.connMode);
        if (parsedState.bugHost) setBugHost(parsedState.bugHost);
        if (parsedState.payload) setPayload(parsedState.payload);
      } catch (e) {
        console.error("Failed to parse saved state, using defaults.");
      }
    }

    const lastLoginDateKey = "HAM_LAST_LOGIN_DATE";
    const today = new Date().toLocaleDateString();
    const lastLogin = localStorage.getItem(lastLoginDateKey);

    if (lastLogin !== today) {
      if (finalSettings.qBits < 999999) {
        finalSettings.qBits = 50;
        addLog("Daily Q-Bits have been reset to 50.", "info");
      }
      localStorage.setItem(lastLoginDateKey, today);
    }

    // --- KERNEL v22.0: AUTO-SYNC PROTOCOL ---
    if (!finalSettings.keysSynced) {
      addLog(
        "Quantum Core: Kunci API tidak terdeteksi. Memulai sinkronisasi otomatis...",
        "info",
      );
      (async () => {
        const result = await geminiService.syncApiKeys(
          finalSettings.groqApiKey,
          finalSettings.geminiApiKey,
        );
        if (result.success) {
          addLog(
            "Enkripsi HAMLI diterapkan. Kunci API diamankan & disinkronkan.",
            "success",
          );
          finalSettings.keysSynced = true;
          setSettings(finalSettings);
        } else {
          addLog(
            "Sinkronisasi otomatis gagal. AI mungkin tidak berfungsi.",
            "error",
          );
          setSettings(finalSettings);
        }
      })();
    } else {
      setSettings(finalSettings);
    }

    // KERNEL v25.0: OMBEH ENCRYPTION BOOT SEQUENCE (RUNS ONCE)
    const encryptionFlag = "OMBEH_ENCRYPTION_V1_APPLIED";
    if (!localStorage.getItem(encryptionFlag)) {
      const encryptionLogs = [
        {
          msg: "OMBEH KERNEL: Perintah diterima. Memulai protokol enkripsi absolut.",
          type: "warn",
          delay: 500,
        },
        {
          msg: "Generating asymmetric fractal keys...",
          type: "info",
          delay: 1000,
        },
        {
          msg: "Wrapping platform layers in cryptographic shell...",
          type: "info",
          delay: 1500,
        },
        {
          msg: "VOID-LOCK v4 ENGAGED. Platform is now immune to external observation.",
          type: "success",
          delay: 800,
        },
      ];
      let delay = 0;
      encryptionLogs.forEach((logInfo) => {
        delay += logInfo.delay;
        setTimeout(() => addLog(logInfo.msg, logInfo.type as any), delay);
      });
      localStorage.setItem(encryptionFlag, "true");
    }

    memoryService.snapshotToCore();
    memoryService.setImmutable(true);
    if (localStorage.getItem("HAM_MEMORY_VERSION") !== MEMORY_VERSION_TAG) {
      localStorage.setItem("HAM_MEMORY_VERSION", MEMORY_VERSION_TAG);
    }

    const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const loadedSessions = savedSessions ? JSON.parse(savedSessions) : [];

    handleNewSession();
    if (loadedSessions.length > 0) {
      setSessions((prev) => [...prev, ...loadedSessions]);
    }

    localLlmService.setProgressCallback((p, t) => {
      setLocalBrainState((prev) => ({
        ...prev,
        progress: p,
        progressText: t,
        isLoading: p < 100 && p > 0,
        isLoaded: p === 100,
      }));
      addLog(`[EXODUS KERNEL] ${t} (${Math.round(p)}%)`, "info");
    });
  }, []);

  useEffect(() => {
    const appState = {
      settings,
      selectedServer,
      sni,
      connMode,
      selectedPort,
      bugHost,
      payload,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [settings, selectedServer, sni, connMode, selectedPort, bugHost, payload]);

  useEffect(() => {
    const sessionsToSave = sessions.filter((s) => s.messages.length > 0);
    if (sessionsToSave.length > 0) {
      localStorage.setItem(
        SESSIONS_STORAGE_KEY,
        JSON.stringify(sessionsToSave),
      );
    }
  }, [sessions]);

  useEffect(() => {
    document.body.classList.remove(
      "theme-dark",
      "theme-light",
      "theme-stealth",
    );
    document.body.style.backgroundColor = "";
    if (settings.theme === "stealth" && settings.stealthModeUnlocked) {
      document.body.classList.add("theme-stealth");
    } else {
      document.body.classList.add("theme-dark");
    }
  }, [settings.theme, settings.stealthModeUnlocked]);

  useEffect(() => {
    if (connState === ConnectionState.CONNECTED) {
      let baseDown = 400;
      let baseUp = 80;
      timerRef.current = setInterval(() => {
        setConnTime((prev) => prev + 1);
        let down = Math.max(
          50,
          baseDown + Math.floor(Math.random() * 400) - 200,
        );
        let up = Math.max(10, baseUp + Math.floor(Math.random() * 100) - 50);
        setStats((prev) => ({
          down,
          up,
          totalDown: prev.totalDown + down / 1024,
          totalUp: prev.totalUp + up / 1024,
        }));
        setEngineLoad(
          Math.round(
            15 + Math.min(60, (down + up) / 100) + (Math.random() * 10 - 5),
          ),
        );
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setConnTime(0);
      setStats((prev) => ({ ...prev, down: 0, up: 0 }));
      setEngineLoad(0);
    }
    return () => clearInterval(timerRef.current);
  }, [connState]);

  const handleRechargeQBits = () => {
    triggerFeedback();
    const password = window.prompt("Enter recharge authorization code:");
    if (password === null) {
      // User cancelled
      return;
    }
    if (password === "dasopano21") {
      setSettings((s) => ({ ...s, qBits: 999999 }));
      addLog(
        "Authorization successful. Quantum Vault capacity is now UNLIMITED.",
        "success",
      );
    } else {
      addLog("Authorization failed. Invalid code.", "error");
    }
  };

  const handleToggle = async () => {
    triggerFeedback();
    if (connState === ConnectionState.DISCONNECTED) {
      setConnState(ConnectionState.CONNECTING);
      addLog("Initializing Quantum Tunnel...", "info");
      setTimeout(() => {
        addLog(
          `Node Lock: ${selectedServer.country} (${selectedServer.ip})`,
          "info",
        );
        setTimeout(() => {
          addLog(`Bypassing ISP via port ${selectedPort}...`, "info");
          setTimeout(() => {
            addLog("Quantum Handshake successful. System Secured.", "success");
            setConnState(ConnectionState.CONNECTED);
          }, 1500);
        }, 1000);
      }, 500);
    } else {
      addLog("Quantum Tunnel Disconnected.", "warn");
      setConnState(ConnectionState.DISCONNECTED);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      addLog(`Attaching ${files.length} file(s)...`, "info");
      const newAttachments = await Promise.all(
        files.map(async (file: File) => {
          return new Promise<Attachment>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(",")[1];
              resolve({ mimeType: file.type, data: base64, name: file.name });
            };
            reader.readAsDataURL(file);
          });
        }),
      );
      setChatAttachments((prev) => [...prev, ...newAttachments]);
      e.target.value = "";
    }
  };

  const handleNewSession = () => {
    triggerFeedback();
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      timestamp: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsHistoryOpen(false);
  };

  const removeAttachment = (index: number) => {
    setChatAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompileLocalModel = async (file: File) => {
    triggerFeedback();
    const isSupported = await localLlmService.isSupported();
    if (!isSupported) {
      addLog(
        "[EXODUS] Error: WebGPU is not supported on this device. Local Cortex cannot be activated.",
        "error",
      );
      return;
    }
    addLog(`[EXODUS] Quantum Transpiler received model: ${file.name}`, "info");
    addLog(
      `[EXODUS] Analyzing headers and fetching compatible neural shaders...`,
      "info",
    );

    try {
      await localLlmService.initializeFromFile(file);
      addLog(
        "[EXODUS] Transpiler complete. Local Cortex is online.",
        "success",
      );
      setSettings((s) => ({ ...s, localModelName: file.name }));
    } catch (e: any) {
      addLog(`[EXODUS] Transpiler Error: ${e.message}`, "error");
    }
  };

  const handleInstallLocalModel = async () => {
    triggerFeedback();
    const isSupported = await localLlmService.isSupported();
    if (!isSupported) {
      addLog(
        "[EXODUS] Error: WebGPU is not supported on this device. Local Cortex cannot be activated.",
        "error",
      );
      return;
    }
    addLog(
      `[EXODUS] Initializing direct download from Quantum Repository...`,
      "info",
    );
    try {
      await localLlmService.initialize();
      addLog(
        "[EXODUS] Default Core download complete. Local Cortex is online.",
        "success",
      );
      setSettings((s) => ({ ...s, localModelName: "gemma-2-2b (Default)" }));
    } catch (e: any) {
      addLog(`[EXODUS] Download Error: ${e.message}`, "error");
    }
  };

  const executeCommand = (command: string, value: string) => {
    triggerFeedback();
    addLog(
      `HAMLI executing: ${command} with value "${value.substring(0, 30)}..."`,
      "warn",
    );
    switch (command) {
      case "set_sni":
        setSni(value);
        break;
      case "set_port":
        setSelectedPort(Number(value));
        break;
      case "set_payload":
        setPayload(value);
        break;
      case "set_server_by_country": {
        const server = serverList.find((s) =>
          s.country.toLowerCase().includes(value.toLowerCase()),
        );
        if (server) setSelectedServer(server);
        else
          addLog(
            `HAMLI Error: Server with country "${value}" not found.`,
            "error",
          );
        break;
      }
      case "set_conn_mode":
        if (connModes.includes(value)) setConnMode(value);
        else
          addLog(
            `HAMLI Error: Connection mode "${value}" is invalid.`,
            "error",
          );
        break;
      case "toggle_setting":
        if (value in settings) {
          setSettings((s) => ({
            ...s,
            [value]: !s[value as keyof AppSettings],
          }));
        } else {
          addLog(`HAMLI Error: Setting "${value}" not found.`, "error");
        }
        break;
      case "add_log":
        addLog(`HAMLI: ${value}`, "info");
        break;
      default:
        addLog(`HAMLI Error: Unknown command "${command}"`, "error");
    }
  };

  const handleChat = async () => {
    if ((!chatInput.trim() && chatAttachments.length === 0) || isChatLoading)
      return;

    const msgText = chatInput;
    const currentAttachments = [...chatAttachments];
    setChatInput("");
    setChatAttachments([]);
    setIsChatLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: msgText,
      timestamp: Date.now(),
      attachments: currentAttachments,
    };
    const sessionForHistory = sessions.find((s) => s.id === activeSessionId);
    const historyForApi = sessionForHistory ? sessionForHistory.messages : [];

    let currentPersona = aiPersona;
    if (msgText.toLowerCase().includes("panggil ombeh")) {
      currentPersona = "OMBEH";
      setAiPersona("OMBEH");
      addLog(
        "System: HAMLI (GODMOD) ENGAGED. SINGULARITY RING ACTIVE.",
        "error",
      );
    } else if (msgText.toLowerCase().includes("panggil lisa")) {
      currentPersona = "LISA";
      setAiPersona("LISA");
      addLog("System: LISA AUTHORITY CORE SYNCHRONIZED.", "warn");
    } else if (msgText.toLowerCase().includes("panggil reza")) {
      currentPersona = "REZA";
      setAiPersona("REZA");
      addLog("System: Standard Assistant Mode.", "info");
    }
    if (
      settings.godModeUnlocked &&
      currentPersona !== "REZA" &&
      currentPersona !== "OMBEH"
    ) {
      currentPersona = "LISA";
      if (aiPersona !== "LISA") setAiPersona("LISA");
    }

    // DEFENSE VISUALIZATION
    if (settings.ghostMode) {
      addLog(
        `[DEFENSE] Encrypting payload via Polymorphic Shield (Lvl ${settings.polymorphicLevel})...`,
        "warn",
      );
    }

    const modelMsgPlaceholder: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "model",
      text: "",
      timestamp: Date.now(),
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const updatedMessages = [...s.messages, userMsg, modelMsgPlaceholder];
          const newTitle =
            s.messages.length === 0 ? msgText.substring(0, 50) : s.title;
          return {
            ...s,
            messages: updatedMessages,
            title: newTitle,
            timestamp: Date.now(),
          };
        }
        return s;
      }),
    );
    memoryService.save(userMsg);

    const needsInternet = [
      "cuaca",
      "berita",
      "terbaru",
      "harga",
      "siapa",
      "apa itu",
      "kapan",
      "di mana",
    ].some((kw) => msgText.toLowerCase().includes(kw));

    if (
      currentPersona === "OMBEH" &&
      settings.useLocalBrain &&
      localBrainState.isLoaded
    ) {
      if (needsInternet) {
        // Not streaming the bridge message for better UX
        const res = await geminiService.getNetworkAdvice(
          msgText,
          historyForApi,
          "LISA",
          currentAttachments,
          settings,
          { onChunk: () => {}, onComplete: () => {}, onError: () => {} },
        ); // This is a limitation, we can't easily stream the bridged result.
        const dataFromLisa = (res as any).text;
        const secondPrompt = `My original question was: "${msgText}". You received this real-time data from LISA: "${dataFromLisa}". Now, answer my original question using this data.`;
        const responseText = await localLlmService.generate(secondPrompt, []);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === modelMsgPlaceholder.id
                      ? { ...m, text: responseText }
                      : m,
                  ),
                }
              : s,
          ),
        );
        setIsChatLoading(false);
      } else {
        const responseText = await localLlmService.generate(
          msgText,
          historyForApi,
        );
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === modelMsgPlaceholder.id
                      ? { ...m, text: responseText }
                      : m,
                  ),
                }
              : s,
          ),
        );
        setIsChatLoading(false);
      }
      return;
    }

    geminiService.getNetworkAdvice(
      msgText,
      historyForApi,
      currentPersona,
      currentAttachments,
      settings,
      {
        onChunk: (textChunk: string) => {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSessionId) {
                const lastMsg = s.messages[s.messages.length - 1];
                if (lastMsg && lastMsg.id === modelMsgPlaceholder.id) {
                  lastMsg.text += textChunk;
                }
                return { ...s, messages: [...s.messages] };
              }
              return s;
            }),
          );
        },
        onComplete: (fullText: string, sources: any[]) => {
          setIsChatLoading(false);

          const commandRegex =
            /<EXECUTE command="([^"]+)" value="([^"]+)" \/>/g;
          let match;
          let cleanText = fullText;

          while ((match = commandRegex.exec(fullText)) !== null) {
            const [, command, value] = match;
            executeCommand(command, value);
            cleanText = cleanText.replace(match[0], "").trim();
          }

          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSessionId) {
                const lastMsg = s.messages[s.messages.length - 1];
                if (lastMsg && lastMsg.id === modelMsgPlaceholder.id) {
                  lastMsg.text = cleanText;
                  lastMsg.sources = sources;
                  memoryService.save(lastMsg);
                }
                return { ...s, messages: [...s.messages] };
              }
              return s;
            }),
          );
        },
        onError: (error: Error) => {
          setIsChatLoading(false);
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSessionId) {
                const lastMsg = s.messages[s.messages.length - 1];
                if (lastMsg && lastMsg.id === modelMsgPlaceholder.id) {
                  lastMsg.text = `⚠️ **AI CORE FAILURE**: ${error.message}`;
                }
                return { ...s, messages: [...s.messages] };
              }
              return s;
            }),
          );
        },
      },
    );
  };

  const handleLoadAppState = (newState: any) => {
    if (newState.settings) setSettings((s) => ({ ...s, ...newState.settings }));
    if (newState.selectedServer) setSelectedServer(newState.selectedServer);
    if (newState.sni) setSni(newState.sni);
    if (newState.connMode) setConnMode(newState.connMode);
    if (newState.selectedPort) setSelectedPort(newState.selectedPort);
    if (newState.bugHost) setBugHost(newState.bugHost);
    if (newState.payload) setPayload(newState.payload);
  };

  if (loading) return <Splash onComplete={() => setLoading(false)} />;

  const appStateForExport = {
    settings,
    selectedServer,
    sni,
    connMode,
    selectedPort,
    bugHost,
    payload,
  };

  return (
    <div className="h-screen w-full bg-[#020617] relative overflow-hidden flex flex-col">
      <Header
        setSidebarOpen={setIsSidebarOpen}
        setView={setView}
        currentView={view}
        onShowHistory={() => setIsHistoryOpen(true)}
        addLog={addLog}
        setLogs={setLogs}
        appState={appStateForExport}
        loadAppState={handleLoadAppState}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        setOpen={setIsSidebarOpen}
        currentView={view}
        setView={setView}
        addLog={addLog}
        networkInfo={networkProfile}
      />
      <ChatHistoryPanel
        isOpen={isHistoryOpen}
        setOpen={setIsHistoryOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setIsHistoryOpen(false);
        }}
        onNewSession={handleNewSession}
        onDeleteSession={(id) =>
          setSessions((prev) => prev.filter((s) => s.id !== id))
        }
      />

      <main className="absolute top-16 bottom-24 left-0 right-0 overflow-hidden bg-[#020617] border-t border-b border-white/5">
        <div className="h-full w-full overflow-y-auto no-scrollbar p-5">
          {view === AppView.HOME && (
            <DashboardView
              connState={connState}
              stats={stats}
              connTime={connTime}
              handleToggle={handleToggle}
              selectedServer={selectedServer}
              openModal={setActiveModal}
              sni={sni}
              setSni={setSni}
              selectedPort={selectedPort}
              setSelectedPort={setSelectedPort}
              connMode={connMode}
              setConnMode={setConnMode}
              connSetup={connSetup}
              setConnSetup={setConnSetup}
              useRealmHost={useRealmHost}
              setUseRealmHost={setUseRealmHost}
              useTcpPayload={useTcpPayload}
              setUseTcpPayload={setUseTcpPayload}
              preserveSni={preserveSni}
              setPreserveSni={setPreserveSni}
              networkProfile={networkProfile}
              addLog={addLog}
              engineLoad={engineLoad}
            />
          )}
          {view === AppView.HAMLI && (
            <HAMLIView
              chatMessages={activeChatMessages}
              isChatLoading={isChatLoading}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleChat={handleChat}
              logEndRef={chatEndRef}
              aiPersona={aiPersona}
              handleFileSelect={handleFileSelect}
              chatAttachments={chatAttachments}
              removeAttachment={removeAttachment}
              settings={settings}
            />
          )}
          {view === AppView.SETTINGS && (
            <SettingsView
              settings={settings}
              setSettings={setSettings}
              setView={setView}
              openModal={setActiveModal}
              resetSettings={() => {
                setSettings(DEFAULT_SETTINGS);
                addLog("Settings wiped.", "warn");
              }}
              triggerFeedback={triggerFeedback}
              addLog={addLog}
              localBrainState={localBrainState}
              onCompileLocalModel={handleCompileLocalModel}
              onInstallLocalModel={handleInstallLocalModel}
            />
          )}
          {view === AppView.PAYLOAD && (
            <PayloadView
              setView={setView}
              payload={payload}
              setPayload={setPayload}
              bugHost={bugHost}
              setBugHost={setBugHost}
              method={method}
              setMethod={setMethod}
              payloadMethods={payloadMethods}
            />
          )}
          {view === AppView.TOOLS && <ToolsView setView={setView} />}
          {view === AppView.EXPORT_AIDE && (
            <ExportAideView setView={setView} addLog={addLog} />
          )}
          {view === AppView.ABOUT && (
            <AboutView setView={setView} engineInfo={engineInfo} />
          )}
          {view === AppView.AUTORENDER && (
            <AutorenderView
              setView={setView}
              addLog={addLog}
              isUnlocked={isVaultUnlocked}
              setIsUnlocked={setIsVaultUnlocked}
            />
          )}
          {view === AppView.QUANTUM_MINING && (
            <QuantumMiningView
              connState={connState}
              addLog={addLog}
              setView={setView}
              qBits={settings.qBits}
              setQBits={(fn: any) =>
                setSettings((s) => ({ ...s, qBits: fn(s.qBits) }))
              }
              handleRechargeQBits={handleRechargeQBits}
            />
          )}
          {view === AppView.VIRTUAL_ROOM && <VirtualRoomView />}
          {view === AppView.MEMORY_INJECTION && (
            <MemoryInjectionView setView={setView} addLog={addLog} />
          )}
          {view === AppView.SOVEREIGN_GATEWAY && (
            <SovereignGatewayView
              settings={settings}
              setSettings={setSettings}
              addLog={addLog}
              triggerFeedback={triggerFeedback}
              setView={setView}
            />
          )}
          {view === AppView.RANDOMIZE_TOOL && (
            <RandomizeToolView setView={setView} />
          )}
          {view === AppView.LOGS && (
            <div className="bg-[#0f172a] rounded-[2rem] p-6 font-mono text-[9px] h-full overflow-hidden flex flex-col border border-white/5 shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                <span className="text-orange-500 font-black uppercase tracking-[0.2em]">
                  Quantum Terminal
                </span>
                <Trash2
                  size={14}
                  className="text-slate-600 cursor-pointer hover:text-red-500"
                  onClick={() => setLogs([])}
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <span className="opacity-30">[{log.time}]</span>
                    <span
                      className={`flex-1 ${log.type === "success" ? "text-green-500" : log.type === "error" ? "text-red-500" : log.type === "warn" ? "text-yellow-500" : "text-slate-400"}`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer currentView={view} setView={setView} />
      <SelectionModal
        active={activeModal}
        setClose={() => setActiveModal(null)}
        data={
          activeModal === "server"
            ? serverList
            : activeModal === "port"
              ? commonPorts
              : activeModal === "tunnel"
                ? baseTunnelOptions
                : activeModal === "tls"
                  ? tlsVersions
                  : activeModal === "connMode"
                    ? connModes
                    : []
        }
        onSelect={(item: any) => {
          triggerFeedback();
          if (activeModal === "server") setSelectedServer(item);
          else if (activeModal === "port") setSelectedPort(item);
          else if (activeModal === "tunnel")
            setSettings((s) => ({ ...s, baseTunnel: item }));
          else if (activeModal === "tls")
            setSettings((s) => ({ ...s, tlsVersion: item }));
          else if (activeModal === "connMode") setConnMode(item);
          setActiveModal(null);
        }}
        current={
          activeModal === "server"
            ? selectedServer
            : activeModal === "tunnel"
              ? settings.baseTunnel
              : activeModal === "tls"
                ? settings.tlsVersion
                : activeModal === "connMode"
                  ? connMode
                  : selectedPort
        }
      />
    </div>
  );
};

export default App;
