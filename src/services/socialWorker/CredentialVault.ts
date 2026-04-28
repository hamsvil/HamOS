import { openDB, IDBPDatabase } from 'idb';

export class CredentialVault {
  private static DB_NAME = 'social_worker_vault';
  private static STORE_NAME = 'social_credentials';
  private static SALT_KEY = 'vault_salt';

  private static async getDB(): Promise<IDBPDatabase> {
    return openDB(this.DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        db.createObjectStore('vault_meta');
      },
    });
  }

  static async getSalt(): Promise<Uint8Array> {
    const db = await this.getDB();
    let salt = await db.get('vault_meta', this.SALT_KEY);
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16));
      await db.put('vault_meta', salt, this.SALT_KEY);
    }
    return salt;
  }

  static async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 250000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: any, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  static async decrypt(encryptedBase64: string, ivBase64: string, key: CryptoKey): Promise<any> {
    const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
    const encrypted = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  static async saveCredential(credential: any) {
    const db = await this.getDB();
    await db.put(this.STORE_NAME, credential);
  }

  static async getCredentials() {
    const db = await this.getDB();
    return db.getAll(this.STORE_NAME);
  }

  static async deleteCredential(id: string) {
    const db = await this.getDB();
    await db.delete(this.STORE_NAME, id);
  }
}
