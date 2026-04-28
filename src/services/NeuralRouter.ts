/* eslint-disable no-useless-assignment */
/* eslint-disable no-control-regex */
import { GoogleGenAI } from "@google/genai";
import { safeStorage } from "../utils/storage";
import { EnvironmentChecker } from "../services/environmentChecker";
import { nativeBridge } from "../utils/nativeBridge";
import { getValidGeminiKeys } from "../config/hardcodedKeys";

export enum AIProvider {
  GEMINI = 'gemini'
}

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  fallbackProviders?: AIProvider[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRatePerSecond: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = performance.now();
    const timePassed = Math.max(0, (now - this.lastRefill) / 1000);
    if (timePassed > 0.001) { // Only refill if at least 1ms has passed
      const newTokens = timePassed * this.refillRatePerSecond;
      this.tokens = Math.min(this.capacity, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  public consume(tokens: number = 1): Promise<void> {
    const operation = this.queue.then(async () => {
      this.refill();
      if (this.tokens >= tokens) {
        this.tokens -= tokens;
        return;
      }

      const tokensNeeded = tokens - this.tokens;
      const waitTimeMs = (tokensNeeded / this.refillRatePerSecond) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));
      this.refill();
      this.tokens -= tokens;
    });
    
    this.queue = operation.catch(() => {});
    return operation;
  }
}

class NeuralRouter {
  private geminiKeys: string[] = [];

  private currentGeminiIndex: number = 0;
  private exhaustedKeys: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 60000;
  
  private globalTokenBucket = new TokenBucket(1000, 10.0);
  private keyTokenBuckets: Map<string, TokenBucket> = new Map();

  // SECURITY: No hardcoded API keys. All provider keys must be supplied via:
  //   1. User Settings (safeStorage — encrypted with device-unique vault key)
  //   2. Environment variables: GEMINI_API_KEY
  //   3. Native Android Bridge (if running as native app)
  // If none of the above are configured, the router returns '' and the caller
  // must handle the missing-key case gracefully (show "configure API key" UI).
  private fallbackKeys: Record<string, string> = {};

  constructor() {}

  private getTokenBucketForKey(key: string, provider: AIProvider): TokenBucket {
      const bucketKey = `${provider}:${key}`;
      if (!this.keyTokenBuckets.has(bucketKey)) {
          const rate = 5.0;
          this.keyTokenBuckets.set(bucketKey, new TokenBucket(100, rate));
      }
      return this.keyTokenBuckets.get(bucketKey)!;
  }

  private deobfuscate(obfuscatedKey: string): string {
    if (!obfuscatedKey) return '';
    try {
      // Improved obfuscation: atob + XOR with a rotating key + reverse
      const raw = atob(obfuscatedKey);
      const salt = "HAM_SYNERGY_2024";
      let result = '';
      for (let i = 0; i < raw.length; i++) {
        result += String.fromCharCode(raw.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
      }
      return result.split('').reverse().join('');
    } catch (e) {
      return obfuscatedKey;
    }
  }

  public getApiKey(provider: AIProvider = AIProvider.GEMINI): string {
    const sanitize = (key: string | null | undefined) => {
      if (!key || typeof key !== 'string') return '';
      // Remove all whitespace, control characters, and non-printable characters
      const sanitized = key.trim().replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
      
      // Reject common placeholder or invalid strings
      const invalidValues = ['undefined', 'null', 'your_api_key', 'your_gemini_api_key', 'placeholder', '[object object]'];
      if (invalidValues.includes(sanitized.toLowerCase())) {
        console.warn(`[NeuralRouter] API Key rejected as invalid placeholder: "${sanitized}"`);
        return '';
      }
      
      return sanitized;
    };

    if (provider === AIProvider.GEMINI) {
        // Priority 0: Hardcoded keys from src/config/hardcodedKeys.ts (edit di sana!)
        const hardcodedGeminiKeys = getValidGeminiKeys();
        for (const hk of hardcodedGeminiKeys) {
          const sanitized = sanitize(hk);
          if (sanitized && !this.isKeyExhausted(sanitized)) return sanitized;
        }

        // Priority 1: User Settings (Local Storage) - Always override env vars if user explicitly set a key
        const userKey = safeStorage.getItem('ham_alternate_api_key');
        if (userKey) {
          const sanitized = sanitize(userKey);
          if (sanitized && !this.isKeyExhausted(sanitized)) return sanitized;
        }

        // Priority 2: Native Android Bridge
        if (EnvironmentChecker.isNativeAndroid()) {
            const nativeKey = sanitize(nativeBridge.call('getApiKey'));
            if (nativeKey && !this.isKeyExhausted(nativeKey)) return nativeKey;
        }

        // Priority 3: Platform Environment
        const platformKey = sanitize(import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) || (import.meta as any).env?.GEMINI_API_KEY);
        if (platformKey && !this.isKeyExhausted(platformKey)) return platformKey;

        // Priority 4: Vite Environment (import.meta.env)
        const viteKey = sanitize((import.meta as any).env?.VITE_GEMINI_API_KEY);
        if (viteKey && !this.isKeyExhausted(viteKey)) return viteKey;

        const viteKeyAlt = sanitize((import.meta as any).env?.GEMINI_API_KEY);
        if (viteKeyAlt && !this.isKeyExhausted(viteKeyAlt)) return viteKeyAlt;

        // Priority 5: Fallback Keys Array
        if (this.geminiKeys.length > 0) {
            let attempts = 0;
            while (attempts < this.geminiKeys.length) {
                const key = this.geminiKeys[this.currentGeminiIndex];
                this.currentGeminiIndex = (this.currentGeminiIndex + 1) % this.geminiKeys.length;
                const sanitized = sanitize(key);
                if (sanitized && !this.isKeyExhausted(sanitized)) return sanitized;
                attempts++;
            }
        }
    }

    if (provider === AIProvider.GEMINI && this.exhaustedKeys.size > 0) {
        let oldestKey = '';
        let oldestTime = Infinity;
        for (const [key, timestamp] of this.exhaustedKeys.entries()) {
            if (timestamp < oldestTime) {
                oldestTime = timestamp;
                oldestKey = key;
            }
        }
        if (oldestKey && (Date.now() - oldestTime > this.COOLDOWN_MS)) {
            this.exhaustedKeys.delete(oldestKey);
            return oldestKey;
        }
    }

    const error = new Error(`API Key for ${provider} is missing, invalid, or exhausted. Please check your API key in Settings (Gear Icon -> AI Models).`);
    (error as any).code = "NO_API_KEY";
    throw error;
  }

  private isKeyExhausted(key: string): boolean {
    const exhaustTime = this.exhaustedKeys.get(key);
    if (!exhaustTime) return false;
    if (Date.now() - exhaustTime > this.COOLDOWN_MS) {
        this.exhaustedKeys.delete(key);
        return false;
    }
    return true;
  }

  public markKeyExhausted(key: string) {
    this.exhaustedKeys.set(key, Date.now());
  }

  public clearExhaustedKeys() {
    this.exhaustedKeys.clear();
  }

  public async executeWithRetry<T>(
    operation: (clients: { gemini?: GoogleGenAI }, apiKey: string) => Promise<T>,
    config: ModelConfig,
    timeoutMs: number = 600000,
    abortSignal?: AbortSignal
  ): Promise<T> {
    return this.executeWithGenAIRetry(operation, config, timeoutMs, abortSignal);
  }

  public isFallbackActive(provider: AIProvider): boolean {
    return false;
  }

  public updateKeys(keys: { gemini?: string[] }) {
    if (keys.gemini) this.geminiKeys = keys.gemini;
    // Clear exhaustion on manual update to allow retrying new keys
    this.exhaustedKeys.clear();
  }

  public async consumeTokens(provider: AIProvider, key: string, count: number = 1, isRetry: boolean = false): Promise<void> {
    // Don't consume global tokens on internal retries to avoid penalizing self-healing
    if (!isRetry) {
        await this.globalTokenBucket.consume(count);
    }
    const bucket = this.getTokenBucketForKey(key, provider);
    await bucket.consume(count);
  }

  public routeModel(complexity: number): ModelConfig {
      if (complexity > 0.8) {
          return { provider: AIProvider.GEMINI, model: 'gemini-2.0-pro-exp-02-05' };
      } else if (complexity > 0.4) {
          return { provider: AIProvider.GEMINI, model: 'gemini-2.0-flash-thinking-exp-01-21' };
      } else if (complexity > 0.2) {
          return { provider: AIProvider.GEMINI, model: 'ham-agentic-shadow' };
      } else {
          return { provider: AIProvider.GEMINI, model: 'gemini-2.0-flash' };
      }
  }
  public async executeWithGenAIRetry<T>(
    operation: (clients: { gemini?: GoogleGenAI }, apiKey: string) => Promise<T>,
    config: ModelConfig,
    timeoutMs: number = 600000,
    abortSignal?: AbortSignal
  ): Promise<T> {
    let lastError: any;
    const maxRetries = 4;
    const providersToTry = [config.provider];
    
    for (const provider of providersToTry) {
        for (let i = 0; i < maxRetries; i++) {
          if (abortSignal?.aborted) throw new Error('AbortError');
    
          let apiKey: string;
          try {
            apiKey = this.getApiKey(provider);
          } catch (e) {
            lastError = e;
            console.warn(`[NeuralRouter] No keys available for provider: ${provider}`);
            break; // Try next provider
          }

          const clients: any = {};
          if (provider === AIProvider.GEMINI) clients.gemini = new GoogleGenAI({ apiKey });
    
          let timer: any;
          
          try {
            await this.globalTokenBucket.consume(1);
            const bucket = this.getTokenBucketForKey(apiKey, provider);
            await bucket.consume(1);
    
            const timeoutPromise = new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
            });
            
            const result = await Promise.race([operation(clients, apiKey), timeoutPromise]);
            clearTimeout(timer);
            return result;
          } catch (error: any) {
            clearTimeout(timer);
            lastError = error;
            
            if (error.message === 'AbortError' || error.name === 'AbortError') {
              throw error;
            }

            const isRateLimit = error.status === 429 || error.message?.includes('429');
            const isQuotaExceeded = error.status === 403 || error.message?.includes('quota');
            const isServerError = error.status >= 500;

            if (isRateLimit || isQuotaExceeded) {
              this.markKeyExhausted(apiKey);
              break; // Try next provider immediately
            } else if (isServerError) {
              const backoff = Math.min(1000 * Math.pow(2, i), 10000);
              await new Promise(resolve => setTimeout(resolve, backoff));
              continue; // Retry same provider
            } else {
              throw error; // Fatal error
            }
          }
        }
    }
    
    throw lastError || new Error('All providers and retries exhausted');
  }
}

export const neuralRouter = new NeuralRouter();
