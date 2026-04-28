 
import { StateRehydrator } from './StateRehydrator';

export class QuantumSync {
    private static channel = new BroadcastChannel('saere_quantum_sync');

    static boot() {
        this.channel.onmessage = async (event) => {
            if (event.data.type === 'STATE_UPDATE') {
                console.log('[SAERE] QuantumSync: Received state update from another tab');
                await StateRehydrator.importBinary(event.data.payload);
            }
        };

        StateRehydrator.observe(async () => {
            const update = await StateRehydrator.exportBinary();
            this.channel.postMessage({
                type: 'STATE_UPDATE',
                payload: update
            });
        });
        
        console.log('[SAERE] QuantumSync: Cross-tab synchronization active');
    }

    static broadcast(type: string, payload: any) {
        this.channel.postMessage({ type, payload });
    }
}
