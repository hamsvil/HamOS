 
export class MerkleScribe {
    static async hashState(state: any): Promise<string> {
        if (typeof crypto === 'undefined' || !crypto.subtle) {
            return btoa(encodeURIComponent(JSON.stringify(state))).substring(0, 64);
        }
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(state));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    static async verifyState(state: any, expectedHash: string): Promise<boolean> {
        const currentHash = await this.hashState(state);
        return currentHash === expectedHash;
    }

    static async logAndVerify(type: string, payload: any): Promise<void> {
        const hash = await this.hashState(payload);
        const entry = `[${new Date().toISOString()}] [${type}] [HASH:${hash.substring(0, 8)}] ${JSON.stringify(payload)}`;
        console.log(`[MERKLE_SCRIBE] ${entry}`);
        
        // In worker context, use postMessage
        if (typeof self !== 'undefined' && 'postMessage' in self) {
            (self as any).postMessage({ type: 'SAERE_LOG', payload: entry });
        }
    }
}
