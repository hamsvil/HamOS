
// --- QUANTUM BRIDGE SERVICE ---
// Connects UI to the Python Engine via WebSocket

type BridgeCallback = (data: any) => void;

class QuantumBridge {
    private socket: WebSocket | null = null;
    private listeners: BridgeCallback[] = [];
    private isConnected: boolean = false;
    private reconnectInterval: any = null;
    private securityToken: string = "";

    constructor() {
        this.connect();
    }

    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

        try {
            this.socket = new WebSocket('ws://localhost:8765');

            this.socket.onopen = () => {
                console.log('[QUANTUM BRIDGE] Connected to Python Core.');
                this.isConnected = true;
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === "AUTH_TOKEN") {
                        this.securityToken = data.token;
                    }
                    
                    this.notifyListeners(data);
                } catch (e) {
                    console.error('Bridge Parse Error:', e);
                }
            };

            this.socket.onclose = () => {
                if(this.isConnected) console.log('[QUANTUM BRIDGE] Disconnected. Retrying...');
                this.isConnected = false;
                this.socket = null;
                if (!this.reconnectInterval) {
                   this.reconnectInterval = setInterval(() => this.connect(), 3000);
                }
            };

            this.socket.onerror = (err) => {
                if (this.socket) this.socket.close();
            };

        } catch (e) {
            console.error('Bridge Connection Failed:', e);
        }
    }

    subscribe(callback: BridgeCallback): () => void {
        this.listeners.push(callback);
        // Return an unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    private notifyListeners(data: any) {
        this.listeners.forEach(cb => cb(data));
    }

    send(command: string, payload: any = {}) {
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({ command, ...payload }));
        } else {
           // Silently fail or queue if needed
        }
    }

    startMining() {
        this.send('START_MINING');
    }

    stopMining() {
        this.send('STOP_MINING');
    }

    getFinanceData() {
        this.send('GET_FINANCE_DATA');
    }

    saveConfig(config: any) {
        this.send('SAVE_CONFIG', { config });
    }
}

export const quantumBridge = new QuantumBridge();
