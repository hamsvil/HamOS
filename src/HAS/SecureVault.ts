 
export const SecureVault = {
    privateKey: null as CryptoKey | null,

    initialize: async (seed?: string) => {
        // ISSUE #4 FIX: Dynamic Seeding
        const finalSeed = seed || (typeof window !== 'undefined' ? 
            `${window.navigator.userAgent}-${window.screen.width}x${window.screen.height}-${Date.now()}` : 
            (typeof self !== 'undefined' && 'navigator' in self ? `${(self as any).navigator.userAgent}-${Date.now()}` : `SAERE-WORKER-${Date.now()}`)); 
            
        console.log(`[SecureVault] Initializing with dynamic entropy...`);
        try {
            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(finalSeed),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            SecureVault.privateKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('SAERE_SALT_2024'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
            return true;
        } catch (e) {
            console.error('[SecureVault] Initialization failed', e);
            return false;
        }
    },

    _getDB: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                return reject(new Error('IndexedDB not available in current environment (Node.js/Worker?)'));
            }
            const req = indexedDB.open('SAERE_VaultDB', 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore('vault');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    setKey: async (name: string, value: string) => {
        const lockFn = async () => {
            if (!SecureVault.privateKey) await SecureVault.initialize();
            const db = await SecureVault._getDB();
            const encoder = new TextEncoder();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                SecureVault.privateKey!,
                encoder.encode(value)
            );

            const payload = {
                iv: Array.from(iv),
                data: Array.from(new Uint8Array(encrypted))
            };

            return new Promise<void>((resolve, reject) => {
                const tx = db.transaction('vault', 'readwrite');
                const store = tx.objectStore('vault');
                const req = store.put(JSON.stringify(payload), `SAERE_VAULT_${name}`);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        };

        if (typeof navigator !== 'undefined' && navigator.locks) {
            return navigator.locks.request(`saere_vault_${name}`, lockFn);
        }
        return lockFn();
    },

    getKey: async (name: string): Promise<string | null> => {
        const lockFn = async () => {
            if (!SecureVault.privateKey) await SecureVault.initialize();
            let db: IDBDatabase;
            try {
                db = await SecureVault._getDB();
            } catch (e) {
                console.warn(`[SecureVault] DB Access rejected: ${name}. Env: ${typeof window === 'undefined' ? 'Node' : 'Browser'}`);
                return null;
            }
            return new Promise<string | null>((resolve, reject) => {
                const tx = db.transaction('vault', 'readonly');
                const store = tx.objectStore('vault');
                const req = store.get(`SAERE_VAULT_${name}`);
                req.onsuccess = async () => {
                    const raw = req.result;
                    if (!raw) return resolve(null);
                    try {
                        const payload = JSON.parse(raw);
                        const decrypted = await crypto.subtle.decrypt(
                            { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
                            SecureVault.privateKey!,
                            new Uint8Array(payload.data)
                        );
                        resolve(new TextDecoder().decode(decrypted));
                    } catch (e) {
                        console.error('[SecureVault] Decryption failed', e);
                        resolve(null);
                    }
                };
                req.onerror = () => reject(req.error);
            });
        };

        if (typeof navigator !== 'undefined' && navigator.locks) {
            return navigator.locks.request(`saere_vault_${name}`, { mode: 'shared' }, lockFn);
        }
        return lockFn();
    }
};
