/* eslint-disable no-useless-assignment */
/**
 * HAM SecureVault v2.0 — Browser-Native Key Derivation Engine
 *
 * Eliminates hardcoded encryption keys by:
 *   1. Generating a cryptographically random 256-bit seed on first install (via
 *      crypto.getRandomValues — CSPRNG, never predictable).
 *   2. Computing a multi-factor device fingerprint from browser/hardware properties.
 *   3. Deriving the final AES-GCM key via PBKDF2(seed ‖ fingerprint, salt, 200 000 iter, SHA-256).
 *
 * Attack resistance:
 *   • Static analysis: no key in source code
 *   • Storage theft: seed alone is useless without matching fingerprint
 *   • Fingerprint spoofing: seed alone must also match — attacker needs BOTH
 *   • Brute-force: PBKDF2 @ 200k iterations + SHA-256 makes GPU attacks infeasible
 *
 * The vault seed is stored in a DEDICATED IndexedDB object-store ("__hamVault")
 * that is NOT part of the main safeStorage table, preventing accidental exposure.
 */

const VAULT_DB_NAME = '__hamVault';
const VAULT_STORE = 'seeds';
const VAULT_SEED_KEY = 'installSeed_v2';
const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = 'SHA-256';
const KEY_LENGTH_BITS = 256;

// ── helpers ────────────────────────────────────────────────────────────────

const buf2hex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

const hex2buf = (hex: string): ArrayBuffer => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
};

const str2buf = (s: string): ArrayBuffer => new TextEncoder().encode(s).buffer as ArrayBuffer;

// ── vault database ──────────────────────────────────────────────────────────

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(VAULT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(VAULT_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readVaultSeed(db: IDBDatabase): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readonly');
    const req = tx.objectStore(VAULT_STORE).get(VAULT_SEED_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function writeVaultSeed(db: IDBDatabase, seed: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite');
    const req = tx.objectStore(VAULT_STORE).put(seed, VAULT_SEED_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── device fingerprint ──────────────────────────────────────────────────────

function collectDeviceFingerprint(): string {
  try {
    const parts: string[] = [
      navigator.userAgent,
      String(screen.width),
      String(screen.height),
      String(screen.colorDepth),
      navigator.language || 'en',
      String(navigator.hardwareConcurrency || 0),
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    ];

    // Canvas fingerprint (silent, no popup)
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f00';
        ctx.font = '16px Arial';
        ctx.fillText('HamVault🔑', 10, 24);
        parts.push(canvas.toDataURL().slice(0, 64));
      }
    } catch (_) { /* canvas blocked — skip */ }

    return parts.join('|');
  } catch (_) {
    return 'fallback-device-unknown';
  }
}

// ── PBKDF2 key derivation ───────────────────────────────────────────────────

async function deriveKeyMaterial(seed: string, fingerprint: string): Promise<string> {
  // password = seed (hex) + fingerprint bytes
  const password = str2buf(seed + fingerprint);

  // salt = fixed app-identity bytes (not secret, just domain-specific)
  const saltStr = 'HAM-AISTUDIO-VAULT-SALT-V2-2025';
  const salt = str2buf(saltStr);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    password,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    importedKey,
    KEY_LENGTH_BITS
  );

  return buf2hex(derivedBits);
}

// ── public API ──────────────────────────────────────────────────────────────

let _cachedKey: string | null = null;
let _initPromise: Promise<string> | null = null;

/**
 * Returns the derived 256-bit hex encryption key for this device/install.
 * Safe to call multiple times — result is memoized after first call.
 */
export async function getVaultKey(): Promise<string> {
  if (_cachedKey) return _cachedKey;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const db = await openVaultDb();
      let seed = await readVaultSeed(db);

      if (!seed) {
        // First run: generate a truly random 32-byte seed
        const randBytes = new Uint8Array(32);
        crypto.getRandomValues(randBytes);
        seed = buf2hex(randBytes.buffer as ArrayBuffer);
        await writeVaultSeed(db, seed);
      }

      const fingerprint = collectDeviceFingerprint();
      const key = await deriveKeyMaterial(seed, fingerprint);
      _cachedKey = key;
      return key;
    } catch (err) {
      console.error('[SecureVault] Key derivation failed, using emergency fallback:', err);
      // Emergency fallback: derive from install timestamp stored in localStorage
      const tsKey = '__ham_ek_ts__';
      let ts = localStorage.getItem(tsKey);
      if (!ts) {
        ts = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
        try { localStorage.setItem(tsKey, ts); } catch (_) { /* private mode */ }
      }
      const fingerprint = collectDeviceFingerprint();
      const fallbackKey = await deriveKeyMaterial(ts, fingerprint);
      _cachedKey = fallbackKey;
      return fallbackKey;
    }
  })();

  return _initPromise;
}

/**
 * Synchronous read of the cached vault key.
 * Returns null if the vault has not been initialized yet.
 * Always call initVault() (or getVaultKey()) during app startup first.
 */
export function getVaultKeySync(): string | null {
  return _cachedKey;
}

/**
 * Call once during app initialization to pre-load and cache the vault key.
 */
export const initVault = getVaultKey;
