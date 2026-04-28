
export enum AppView {
  HOME = 'home',
  LOGS = 'logs',
  SETTINGS = 'settings',
  HAMLI = 'hamli',
  TOOLS = 'tools',
  PAYLOAD = 'payload_builder',
  EXPORT_AIDE = 'export_aide',
  AUTORENDER = 'autorender',
  ABOUT = 'about',
  QUANTUM_MINING = 'quantum_mining',
  VIRTUAL_ROOM = 'virtual_room',
  MEMORY_INJECTION = 'memory_injection',
  SOVEREIGN_GATEWAY = 'sovereign_gateway',
  RANDOMIZE_TOOL = 'randomize_tool'
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected'
}

export interface EngineConfig {
  name: string;
  type: 'groq' | 'gemini';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  capabilities: Array<'text' | 'image'>;
}

export interface VPNServer {
  id: string;
  country: string;
  flag: string;
  latency: string;
  ip: string;
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sources?: { title: string; uri: string | undefined }[];
  attachments?: Attachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

export interface LicenseConfig {
  key: string;
  updateLink: string;
  expiryOption: string;
  customExpiry: string;
  remoteSyncUrl: string;
}

export interface AppSettings {
  sound: boolean;
  vibrate: boolean;
  theme: 'dark' | 'light' | 'stealth';
  baseTunnel: 'P2P - Stable' | 'SSH 2.0';
  tlsVersion: 'Any' | 'TLS 1.0' | 'TLS 1.1' | 'TLS 1.2' | 'TLS 1.3';
  forwardDns: boolean;
  useHttpProxy: boolean;
  udpForward: boolean;
  wakelock: boolean;
  autoReconnect: boolean;
  compression: boolean;
  connectionRetry: boolean;
  primaryDns: string;
  httpProxy: {
    host: string;
    port: string;
  };
  overridePrimaryHost: boolean;
  primaryHost: string;
  primaryNameserver: string;
  // EXODUS PROTOCOL
  useLocalBrain: boolean;
  localModelName: string;
  localModelThreads: number;
  // UNIVERSAL HOST PROTOCOL (NEW)
  useCustomHost: boolean;
  customBaseUrl: string; // e.g. https://huggingface.co/api/... or http://localhost:11434
  customApiKey: string;
  customModelName: string;
  // QUANTUM MINING & VAULT
  qBits: number;
  godModeUnlocked: boolean;
  stealthModeUnlocked: boolean;
  autoStartMining: boolean; // NEW: Auto-start mining on launch
  // API KEY STATUS
  keysSynced: boolean;
  groqApiKey: string;
  geminiApiKey: string;
  // SECURITY DEFENSE V35
  ghostMode: boolean;       // Aktivasi enkripsi prompt
  polymorphicLevel: number; // Tingkat keacakan header (1-5)
  // SOVEREIGN GATEWAY
  twilioSid: string;
  twilioToken: string;
  xenditKey: string;
  gopayPhoneNumber: string;
  danaPhoneNumber: string;
}

export interface LocalBrainState {
  isLoaded: boolean;
  isLoading: boolean;
  progress: number;
  progressText: string;
  error?: string;
}

declare global {
    interface Window {
        AndroidBridge?: {
            toast: (msg: string) => void;
            saveToDocuments: (filename: string, content: string) => void;
            readFromDocuments: (filename: string) => string | null;
            encryptAndSaveConfig: (jsonConfig: string) => void;
            decryptAndLoadConfig: () => string | null;
            startVpnService?: (config: string) => void;
        }
    }
}
