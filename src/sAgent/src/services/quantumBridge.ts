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
        if (this.socket) return;

        try {
            this.socket = new WebSocket('ws://localhost:8765');

            this.socket.onopen = () => {
                console.log('[QUANTUM BRIDGE] Connected to Python Core.');
                this.isConnected = true;
                if (this.reconnectInterval) clearInterval(this.reconnectInterval);
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Capture Security Token Handshake
                    if (data.type === "AUTH_TOKEN") {
                        this.securityToken = data.token;
                        console.log("[BRIDGE] Security Token Received.");
                    }
                    
                    this.notifyListeners(data);
                } catch (e) {
                    console.error('Bridge Parse Error:', e);
                }
            };

            this.socket.onclose = () => {
                console.log('[QUANTUM BRIDGE] Disconnected. Retrying...');
                this.isConnected = false;
                this.socket = null;
                this.reconnectInterval = setTimeout(() => this.connect(), 3000);
            };

            this.socket.onerror = (err) => {
                console.warn('[QUANTUM BRIDGE] Error. Engine might be offline.');
                this.socket?.close();
            };

        } catch (e) {
            console.error('Bridge Connection Failed:', e);
        }
    }

    subscribe(callback: BridgeCallback) {
        this.listeners.push(callback);
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
            console.warn('[QUANTUM BRIDGE] Cannot send command. Socket offline.');
        }
    }

    startMining() {
        this.send('START_MINING');
    }

    stopMining() {
        this.send('STOP_MINING');
    }

    syncQBits(value: number) {
        this.send('SYNC_QBITS', { value });
    }

    // --- FINANCE COMMANDS ---
    getFinanceData() {
        this.send('GET_FINANCE_DATA');
    }

    withdrawFunds(amount: number, currency: string) {
        if (!this.securityToken) {
            console.error("Cannot withdraw: No Security Token. Wait for handshake.");
            return;
        }
        this.send('WITHDRAW_FUNDS', { 
            amount, 
            currency, 
            token: this.securityToken 
        });
    }

    saveConfig(config: any) {
        this.send('SAVE_CONFIG', { config });
    }
}

export const quantumBridge = new QuantumBridge();
