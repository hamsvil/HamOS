/* eslint-disable no-useless-assignment */
import CryptoJS from 'crypto-js';
import { structuredDb } from '../db/structuredDb';
import { initVault } from '../security/SecureVault';
import { initAppSecurityConfig } from '../constants/config';

// ── Encryption key — populated asynchronously during initStorage() ────────────
// SECURITY: Never hardcoded. Derived from a device-unique random seed + browser
// fingerprint via PBKDF2 (200k iterations, SHA-256). See SecureVault.ts.
let ENCRYPTION_KEY: string = '';

// Legacy key kept ONLY for migrating data previously encrypted with the old static key.
// Not used for any new encryption once vault key is available.
const LEGACY_ENCRYPTION_KEY = 'ham-os-quantum-secure-key-v5.5';

const encrypt = (text: string): string => {
  const key = ENCRYPTION_KEY || LEGACY_ENCRYPTION_KEY;
  try {
    return CryptoJS.AES.encrypt(text, key).toString();
  } catch (e) {
    console.error("Encryption failed", e);
    return text; // Fallback to plaintext if encryption fails (should not happen)
  }
};

const decrypt = (text: string): string => {
  // Attempt 1: current vault-derived key (preferred, available after initStorage)
  if (ENCRYPTION_KEY) {
    try {
      const bytes = CryptoJS.AES.decrypt(text, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (decrypted) return decrypted;
    } catch (_) { /* fall through to next attempt */ }
  }

  // Attempt 2: legacy static key (backwards-compat for existing installs)
  try {
    const bytes = CryptoJS.AES.decrypt(text, LEGACY_ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted) return decrypted;
  } catch (_) { /* fall through */ }

  // Attempt 3: very old XOR obfuscation fallback
  try {
    return atob(text).split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ (i % 255))
    ).join('');
  } catch (fallbackError) {
    return text;
  }
};

const SENSITIVE_KEYS = ['ham_user_api_key', 'ham_alternate_api_key', 'github_token'];

// In-memory cache for synchronous reads
const memoryCache = new Map<string, string>();
const MAX_MEMORY_CACHE_SIZE = 500;

const setMemoryCache = (key: string, value: string) => {
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, value);
};

let isInitialized = false;

/**
 * Re-encrypts any sensitive items stored with the legacy static key
 * using the new vault-derived key. Runs once after vault init completes.
 */
const migrateEncryptedItems = async (): Promise<void> => {
  for (const sensKey of SENSITIVE_KEYS) {
    const stored = memoryCache.get(sensKey);
    if (!stored) continue;

    // Skip if already decryptable with the new vault key
    try {
      const bytes = CryptoJS.AES.decrypt(stored, ENCRYPTION_KEY);
      const result = bytes.toString(CryptoJS.enc.Utf8);
      if (result) continue;
    } catch (_) { /* needs migration */ }

    // Attempt to decrypt with legacy key and re-encrypt with vault key
    try {
      const bytes = CryptoJS.AES.decrypt(stored, LEGACY_ENCRYPTION_KEY);
      const plaintext = bytes.toString(CryptoJS.enc.Utf8);
      if (plaintext) {
        const reEncrypted = CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString();
        setMemoryCache(sensKey, reEncrypted);
        await structuredDb.safeStorage.put({ key: sensKey, value: reEncrypted });
      }
    } catch (_) { /* not legacy-encrypted — skip */ }
  }
};

export const initStorage = async () => {
  if (isInitialized) return;
  try {
    // ── Step 1: Derive device-unique vault key before touching any stored data ──
    try {
      const vaultKey = await initVault();
      ENCRYPTION_KEY = vaultKey;
      // Inject into APP_CONFIG.SECURITY.HMAC_SECRET via getter
      initAppSecurityConfig(vaultKey);
    } catch (vaultErr) {
      console.error('[Storage] SecureVault init failed — falling back to legacy key:', vaultErr);
      ENCRYPTION_KEY = LEGACY_ENCRYPTION_KEY;
    }

    // ── Step 2: Load all items from Dexie ──────────────────────────────────────
    const allItems = await structuredDb.safeStorage.toArray();
    
    for (const item of allItems) {
      setMemoryCache(item.key, item.value);
    }
    
    // ── Step 3: Migrate from localStorage if Dexie is empty ────────────────────
    if (allItems.length === 0) {
      const migrationPromises: Promise<any>[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            setMemoryCache(key, value);
            migrationPromises.push(structuredDb.safeStorage.put({ key, value }));
          }
        }
      }
      await Promise.all(migrationPromises);
      // Clear localStorage after migration to enforce IndexedDB isolation
      localStorage.clear();
    }

    // ── Step 4: Re-encrypt legacy-encrypted items with vault key ───────────────
    if (ENCRYPTION_KEY && ENCRYPTION_KEY !== LEGACY_ENCRYPTION_KEY) {
      await migrateEncryptedItems();
    }
    
    isInitialized = true;
  } catch (e) {
    console.error("Failed to initialize storage", e);
    // Fallback to localStorage if Dexie fails
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) setMemoryCache(key, value);
      }
    }
    isInitialized = true;
  }
};

export const safeStorage = {
  isReady: () => isInitialized,
  getItem: (key: string): string | null => {
    if (!isInitialized) {
      // Return null silently or from localStorage without warning if it's boot phase
      const val = localStorage.getItem(key) || memoryCache.get(key);
      if (val) {
        if (SENSITIVE_KEYS.includes(key)) {
          try {
            const decrypted = decrypt(val);
            if (decrypted === val && val.length > 32) return null; 
            return decrypted;
          } catch (e) { 
            return null; 
          }
        }
        return val;
      }
      return null;
    }
    try {
      const value = memoryCache.get(key);
      if (value && SENSITIVE_KEYS.includes(key)) {
        const decrypted = decrypt(value);
        if (decrypted === value && value.length > 32) return null;
        return decrypted;
      }
      return value || null;
    } catch (e) {
      console.warn(`Failed to get item ${key}`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      let finalValue = value;
      if (SENSITIVE_KEYS.includes(key)) {
        finalValue = encrypt(value);
      }
      setMemoryCache(key, finalValue);
      // Async write to Dexie
      structuredDb.safeStorage.put({ key, value: finalValue }).catch(e => console.warn('Dexie set failed', e));
      // No longer writing to localStorage for isolation
    } catch (e) {
      console.warn(`Failed to set item ${key}`, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      memoryCache.delete(key);
      structuredDb.safeStorage.delete(key).catch(e => console.warn('Dexie del failed', e));
      localStorage.removeItem(key); 
    } catch (e) {
      console.warn(`Failed to remove item ${key}`, e);
    }
  },
  clear: (): void => {
    try {
      memoryCache.clear();
      structuredDb.safeStorage.clear().catch(e => console.warn('Dexie clear failed', e));
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage', e);
    }
  }
};
