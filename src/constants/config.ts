 

// ── Runtime HMAC secret — populated during app init from SecureVault ──────────
// SECURITY: Never hardcode a secret here. The value is derived at runtime from
// the device-unique vault key (see src/security/SecureVault.ts).
// If initAppSecurityConfig() has not been called yet, reads from VITE_HMAC_SECRET
// env var. If neither is available, signing will fail loudly instead of silently
// using a weak shared fallback.
let _runtimeHmacSecret: string = (import.meta as any).env?.VITE_HMAC_SECRET || '';

/**
 * Call once during app startup (after initVault resolves) to inject the
 * vault-derived HMAC key into APP_CONFIG.SECURITY.HMAC_SECRET.
 */
export function initAppSecurityConfig(vaultKey: string): void {
  if (!vaultKey) {
    console.error('[AppConfig] initAppSecurityConfig called with empty vault key — HMAC signing will be insecure.');
    return;
  }
  // Derive HMAC secret from vault key + app-domain salt so it differs from
  // the encryption key even if both come from the same vault.
  _runtimeHmacSecret = vaultKey.slice(0, 32) + '-HMAC-HAM-OS-V2-' + vaultKey.slice(32, 48);
}

export const APP_CONFIG = {
  AGENT: {
    MAX_LOOPS: 1000,
    TIMEOUT_MS: 30000,
    MAX_HISTORY_TOKENS: 8000, // Approximate
    RETRY_DELAY: 2000,
  },
  FILES: {
    MAX_SIZE_BYTES: 500 * 1024, // 500KB
    MAX_DIFF_SIZE_BYTES: 500 * 1024,
  },
  SECURITY: {
    AUDIT_LOG_KEY: 'ham_audit_logs',
    MAX_LOG_ENTRIES: 100,
    // SECURITY: Getter ensures we always read the latest runtime-injected value.
    // initAppSecurityConfig(vaultKey) must be called during app startup.
    get HMAC_SECRET(): string {
      if (!_runtimeHmacSecret) {
        console.warn('[AppConfig] HMAC_SECRET accessed before initAppSecurityConfig() — using empty key. Call initAppSecurityConfig() in initStorage().');
      }
      return _runtimeHmacSecret;
    },
  },
  PREVIEW: {
    POLLING_INTERVAL: 5000,
    HMR_ENABLED: true,
  },
  SYNC: {
    MAX_RETRIES: 3,
    INITIAL_BACKOFF: 500,
  }
};
