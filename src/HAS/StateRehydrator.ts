 
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export class StateRehydrator {
    private static doc = new Y.Doc();
    private static persistence: IndexeddbPersistence;
    private static state = StateRehydrator.doc.getMap('saere_state');

    static async boot() {
        this.persistence = new IndexeddbPersistence('saere_neural_state', this.doc);
        await this.persistence.whenSynced;
        console.log('[SAERE] State Rehydrated from IndexedDB');
        
        // ISSUE #1 & #5: VFS Backup Sync
        this.observe(async () => {
            try {
                const update = await this.exportBinary();
                const { vfs } = await import('../services/vfsService');
                
                // Optimized binary to base64 conversion avoiding stack overflow
                const CHUNK_SIZE = 8192;
                let binary = '';
                for (let i = 0; i < update.length; i += CHUNK_SIZE) {
                    const chunk = update.subarray(i, i + CHUNK_SIZE);
                    // Use a loop for the chunk to be absolutely safe
                    for (let j = 0; j < chunk.length; j++) {
                        binary += String.fromCharCode(chunk[j]);
                    }
                }
                
                await vfs.writeFile('.saere/neural_core.bin', btoa(binary));
            } catch (e) {
                console.error('[SAERE] Failed to backup neural state:', e);
            }
        });
    }

    static set(key: string, value: any) {
        this.state.set(key, value);
    }

    static get(key: string) {
        return this.state.get(key);
    }

    static observe(callback: (event: Y.YMapEvent<any>) => void) {
        this.state.observe(callback);
    }

    static async exportBinary(): Promise<Uint8Array> {
        return Y.encodeStateAsUpdate(this.doc);
    }

    static async importBinary(update: Uint8Array) {
        Y.applyUpdate(this.doc, update);
    }
}
