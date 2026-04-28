/* eslint-disable no-useless-assignment */
/* eslint-disable no-control-regex */
import { GoogleGenAI } from "@google/genai";
import { safeStorage } from "../utils/storage";
import { getValidGeminiKeys } from "../config/hardcodedKeys";

class HamliKeyManager {
  // Gabungan: hardcoded keys dari config (prioritas atas) + fallback default
  private keys: string[] = [
    ...getValidGeminiKeys(), // Keys dari src/config/hardcodedKeys.ts (edit di sana!)
    "AIzaSyCc1JzfMMbaLaW6iofoRAjOCs-TOr722Xk",
    "AIzaSyC_GtMRdx-SNeljqjHvLSDmwAe3Cnde944",
    "AIzaSyATEOpDthvIVTe9Qmibj-SUaldX4bAR_fg",
    "AIzaSyCB5rT0XOmM3Uya-RCvv9nH4ejzJKbO4mo",
    "AIzaSyA3oECm3LPMJiGrnOqgP4HOmVc8lIzaRmU",
    "AIzaSyALDZbARVJH6y3NdGA3qF8R79PKRumnnY4",
    "AIzaSyAc7az8XsCm8VJpLl1FJaVW4w6G0r_hkuU",
    "AIzaSyDJD-1Bv51RLy0kCgjhPM5GjH4KQA8Ovls",
    "AIzaSyASoHtVn3-LHp_LuprdF6bEtBXcng0Q0-s",
    "AIzaSyBot_wI79p6AVdIR3yrL18_Q2UUuT5P6kc",
    "AIzaSyAr_yefLzF-fMiNNJpc07A9o2z46qLvfzA",
    "AIzaSyCSUCgPU7_WfJ-LRbXMjO9YFWpgef41YRQ",
    "AIzaSyBYdyB-jeX9y29vH23GjUy0OXhjqcgXI04",
    "AIzaSyBgDdSvezuWsMGuBkQSw2_RNbZp_J9l7xk",
    "AIzaSyBMB1RU9ietk2qx6WFFGoQSWTfGzO9Lz04"
  ].filter(k => k && k.trim().length > 10);

  private currentIndex: number = 0;
  private exhaustedKeys: Map<string, number> = new Map(); // key -> exhaust timestamp
  private currentActiveKey: string | null = null;
  private readonly COOLDOWN_MS = 60000; // 1 minute cooldown for rate limits

  constructor() {}

  public markKeyExhausted(key?: string) {
    const targetKey = key || this.currentActiveKey;
    if (targetKey) {
      this.exhaustedKeys.set(targetKey, Date.now());
    }
  }

  public rotateKey() {
    this.markKeyExhausted();
  }

  // Simple obfuscation to prevent plain text storage scanning
  private obfuscate(key: string): string {
    return btoa(key.split('').reverse().join(''));
  }

  private deobfuscate(obfuscatedKey: string): string {
    try {
      return atob(obfuscatedKey).split('').reverse().join('');
    } catch (e) {
      return obfuscatedKey; // Fallback for legacy plain keys
    }
  }

  public getCurrentKey(): string {
    return this.getApiKey();
  }

  public getApiKey(): string {
    // Priority 0: Hardcoded keys from src/config/hardcodedKeys.ts (EDIT DI SANA!)
    const hardcodedKeys = getValidGeminiKeys();
    for (const hk of hardcodedKeys) {
      const sanitized = hk.replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
      if (sanitized && !this.isKeyExhausted(sanitized)) {
        this.currentActiveKey = sanitized;
        return sanitized;
      }
    }

    // Priority 1: Environment Variable (Highest Priority for User Configuration)
    let envKey = '';
    try {
      // @ts-ignore
      envKey = import.meta.env.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';
    } catch (e) {
      try {
        // @ts-ignore
        envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      } catch (e2) {}
    }

    if (envKey) {
      const sanitizedEnv = envKey.replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
      if (sanitizedEnv && !this.isKeyExhausted(sanitizedEnv)) {
        this.currentActiveKey = sanitizedEnv;
        return sanitizedEnv;
      }
    }

    // Priority 2: User-provided key from Settings
    const userKey = safeStorage.getItem('ham_alternate_api_key');
    if (userKey) {
      const sanitized = userKey.replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
      if (sanitized && !this.isKeyExhausted(sanitized)) {
        this.currentActiveKey = sanitized;
        return sanitized;
      }
    }

    // Priority 3: Key Pool (Fallback - Rolling)
    if (this.keys.length > 0) {
        let attempts = 0;
        while (attempts < this.keys.length) {
            const key = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;
            const sanitizedPoolKey = key.replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
            if (sanitizedPoolKey && !this.isKeyExhausted(sanitizedPoolKey)) {
                this.currentActiveKey = sanitizedPoolKey;
                return sanitizedPoolKey;
            }
            attempts++;
        }
    }

    // If all keys are exhausted, find the one that has been cooling down the longest
    if (this.exhaustedKeys.size > 0) {
        let oldestKey = '';
        let oldestTime = Infinity;
        
        for (const [key, timestamp] of this.exhaustedKeys.entries()) {
            if (timestamp < oldestTime) {
                oldestTime = timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey && (Date.now() - oldestTime > this.COOLDOWN_MS)) {
            // Force reuse the oldest exhausted key only if cooldown has passed
            this.exhaustedKeys.delete(oldestKey);
            this.currentActiveKey = oldestKey;
            return oldestKey;
        }
    }

    const error = new Error("API Key Ham Engine tidak ditemukan atau semua key telah mencapai limit. Harap atur key baru di Pengaturan.");
    (error as unknown as { code: string }).code = 'NO_API_KEY';
    throw error;
  }

  private isKeyExhausted(key: string): boolean {
    const exhaustTime = this.exhaustedKeys.get(key);
    if (!exhaustTime) return false;
    
    // Check if cooldown period has passed (50% replenishment simulation)
    if (Date.now() - exhaustTime > this.COOLDOWN_MS) {
        this.exhaustedKeys.delete(key);
        return false;
    }
    return true;
  }

  public getClient(): GoogleGenAI {
    const apiKey = this.getApiKey();
    return new GoogleGenAI({ apiKey });
  }

  public async executeWithRetry<T>(operation: (client: GoogleGenAI) => Promise<T>, timeoutMs: number = 30000, abortSignal?: AbortSignal): Promise<T> {
    let lastError: any;
    const maxRetries = this.keys.length + 2; // Try all keys in the pool plus user keys
    
    for (let i = 0; i < maxRetries; i++) {
      if (abortSignal?.aborted) {
        const abortError = new Error('AbortError');
        abortError.name = 'AbortError';
        throw abortError;
      }

      const apiKey = this.getApiKey();
      const client = new GoogleGenAI({ apiKey });
      let timer: ReturnType<typeof setTimeout>;
      
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
          if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
              clearTimeout(timer);
              const abortError = new Error('AbortError');
              abortError.name = 'AbortError';
              reject(abortError);
            }, { once: true });
          }
        });
        
        const result = await Promise.race([operation(client), timeoutPromise]);
        clearTimeout(timer);
        return result;
      } catch (error: any) {
        clearTimeout(timer!);
        const err = error as Error & { status?: number };
        if (err.name === 'AbortError' || err.message === 'AbortError' || abortSignal?.aborted) {
          throw err;
        }
        
        lastError = err;
        
        const isAuthError = err.status === 401 || err.status === 403 || err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key');
        
        if (isAuthError) {
            this.rotateKey();
            if (i < maxRetries - 1) continue;
            throw err;
        }

        const isRetryable = 
          err.status === 429 || 
          (err.status && err.status >= 500) ||
          err.message?.includes('429') || 
          err.message?.includes('quota') || 
          err.message?.includes('network') ||
          err.message?.includes('timed out') ||
          err.message?.includes('Failed to fetch') ||
          err.message?.toLowerCase().includes('failed to call') ||
          err.message?.includes('Cache');

        if (isRetryable) {
          this.rotateKey();
          
          if (i < maxRetries - 1) {
              // Only apply long backoff if ALL keys are currently exhausted
              // If we still have fresh keys, we can retry almost immediately
              let envKeyCount = 0;
              try {
                // @ts-ignore
                if (import.meta.env.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY) envKeyCount = 1;
              } catch (e) {
                try {
                  // @ts-ignore
                  if (import.meta.env.VITE_GEMINI_API_KEY) envKeyCount = 1;
                } catch (e2) {}
              }
              const totalAvailableKeys = this.keys.length + (safeStorage.getItem('ham_alternate_api_key') ? 1 : 0) + envKeyCount;
              const allKeysExhausted = this.exhaustedKeys.size >= totalAvailableKeys;

              let delay = 10; // Fast retry for fresh key in milliseconds
              
              if (allKeysExhausted) {
                  // Smart Exponential Backoff with Jitter for 429 when all keys are exhausted
                  delay = 1000 * Math.pow(2, i);
                  if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
                      delay = (10000 * Math.pow(2, i)) + (Math.random() * 2000); // 10s, 20s, 40s + jitter
                  }
              }
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
          }
        }
        
        throw err;
      }
    }
    
    throw lastError || new Error("Network unstable. Please check connection.");
  }
}

export const hamliKeyManager = new HamliKeyManager();
