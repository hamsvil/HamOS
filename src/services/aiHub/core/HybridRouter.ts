import { ModelProvider, RouteDecision } from './types';

/**
 * HybridRouter — HAM ENGINE Routing Decision Layer
 *
 * FIX #4: Default selalu ke gemini-cloud.
 * Local-LLM hanya dipilih jika:
 *   (a) isLocalLlmReady === true (user sudah download model), DAN
 *   (b) jaringan benar-benar offline (tidak ada fallback sama sekali), ATAU
 *   (c) user secara eksplisit mengaktifkan "Local AI Mode" via forceLocal flag.
 *
 * Sebelumnya: default ke local-llm untuk semua token < 4096 → silent fail karena model belum didownload.
 */
export class HybridRouter {
  private readonly cloudModel: string = 'gemini-2.5-flash';
  private readonly localModel: string = 'Llama-3-8B-Instruct-q4f32_1-MLC';

  constructor(
    // maxTokensForLocal dipertahankan untuk kompatibilitas API — tidak lagi dipakai sebagai pemicu routing ke local
    private readonly maxTokensForLocal: number = 4096,
  ) {}

  /**
   * @param estimatedTokens  Estimasi token dari pesan + konteks
   * @param isNetworkOnline  true jika jaringan tersedia (dari navigator.onLine / ping)
   * @param isCloudApiRateLimited  true jika CircuitBreaker OPEN
   * @param isLocalLlmReady  true jika model lokal sudah diload ke memori (webLlmService.isReady())
   * @param forceLocal  true jika user mengaktifkan "Local AI Mode" di Settings
   */
  public async determineRoute(
    estimatedTokens: number,
    isNetworkOnline: boolean,
    isCloudApiRateLimited: boolean,
    isLocalLlmReady: boolean = false,
    forceLocal: boolean = false,
  ): Promise<RouteDecision> {

    // ── 1. User explicitly requested Local AI Mode ─────────────────────────
    if (forceLocal) {
      if (isLocalLlmReady) {
        return {
          provider: 'local-llm',
          modelId: this.localModel,
          reason: 'User-forced Local AI Mode. Model is ready.',
          estimatedTokens,
        };
      }
      // forceLocal requested but model not ready → fall through to cloud
      console.warn('[HybridRouter] forceLocal=true but local LLM is not ready. Falling back to cloud.');
    }

    // ── 2. Offline AND local model is ready → use local ───────────────────
    if (!isNetworkOnline && isLocalLlmReady) {
      return {
        provider: 'local-llm',
        modelId: this.localModel,
        reason: 'Network offline and local model is ready. Using local execution.',
        estimatedTokens,
      };
    }

    // ── 3. Offline but local model NOT ready → cannot proceed ─────────────
    if (!isNetworkOnline && !isLocalLlmReady) {
      // Return local-llm anyway so the calling code can surface the correct error
      // (model not downloaded). This is better than silently returning nothing.
      return {
        provider: 'local-llm',
        modelId: this.localModel,
        reason: 'Network offline. Local model not downloaded yet — user must download model first.',
        estimatedTokens,
      };
    }

    // ── 4. Cloud rate-limited AND local model ready → use local ───────────
    if (isCloudApiRateLimited && isLocalLlmReady) {
      return {
        provider: 'local-llm',
        modelId: this.localModel,
        reason: 'Cloud API rate limited (Circuit Breaker OPEN) and local model is ready.',
        estimatedTokens,
      };
    }

    // ── 5. Default: always route to cloud (safe default) ──────────────────
    // This covers:
    //   - Cloud available + local not ready (most common case)
    //   - Cloud rate-limited but local also not ready
    //   - Any token count within/above maxTokensForLocal
    return {
      provider: 'gemini-cloud',
      modelId: this.cloudModel,
      reason: `Routing to cloud (tokens: ${estimatedTokens}). Local LLM ready: ${isLocalLlmReady}.`,
      estimatedTokens,
    };
  }
}
