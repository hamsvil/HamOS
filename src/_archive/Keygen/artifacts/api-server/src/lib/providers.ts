import fetch from "node-fetch";
import { isCircuitOpen, recordSuccess, recordFailure } from "./circuitBreaker.js";

export interface ProviderConfig {
  slug: string;
  name: string;
  validateUrl: string;
  validateMethod: string;
  validateHeader: string;
  timeoutMs: number;
}

const SSRF_BLOCKED = ["localhost", "127.", "0.0.0.0", "::1", "10.", "192.168.", "172.16.", "169.254.", "metadata.google", "169.254.169.254"];

export function isSsrfBlocked(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return SSRF_BLOCKED.some((b) => host.includes(b));
  } catch {
    return true;
  }
}

function buildRequestParams(
  key: string,
  baseUrl: string,
  validateHeader: string,
): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = { "User-Agent": "HamKeyGen/1.0", "Accept": "application/json" };

  // 1. Placeholder substitution: any URL containing __KEY__ uses query/path injection.
  if (baseUrl.includes("__KEY__")) {
    return { url: baseUrl.replace("__KEY__", encodeURIComponent(key)), headers };
  }

  // 2. Special pseudo-headers.
  if (validateHeader === "query") {
    return { url: `${baseUrl}${encodeURIComponent(key)}`, headers };
  }

  // 3. "Authorization: Scheme" → use the explicit scheme.
  if (validateHeader.toLowerCase().startsWith("authorization:")) {
    const scheme = validateHeader.slice(validateHeader.indexOf(":") + 1).trim();
    headers["Authorization"] = scheme ? `${scheme} ${key}` : key;
    return { url: baseUrl, headers };
  }

  // 4. Plain "Authorization" → default to Bearer (the OAuth/REST convention).
  if (validateHeader.toLowerCase() === "authorization") {
    headers["Authorization"] = `Bearer ${key}`;
    return { url: baseUrl, headers };
  }

  // 5. Custom header name → put the raw key as its value.
  headers[validateHeader] = key;
  return { url: baseUrl, headers };
}

function tierFromHeaders(h: import("node-fetch").Headers): string | null {
  const limit = h.get("x-ratelimit-limit-requests") || h.get("x-ratelimit-limit") || h.get("ratelimit-limit");
  const remaining = h.get("x-ratelimit-remaining-requests") || h.get("x-ratelimit-remaining") || h.get("ratelimit-remaining");
  const tier = h.get("x-ratelimit-tier") || h.get("openai-organization") || h.get("x-organization");
  if (tier) return String(tier);
  if (limit) return `quota ${limit}${remaining ? ` (remaining ${remaining})` : ""}`;
  return null;
}

export async function validateKeyAgainstProvider(
  key: string,
  provider: ProviderConfig,
): Promise<{ status: "valid" | "invalid" | "error" | "rate_limited"; responseTime: number; error?: string; tier?: string | null }> {
  if (isCircuitOpen(provider.slug)) {
    return { status: "error", responseTime: 0, error: "Circuit breaker open" };
  }

  if (isSsrfBlocked(provider.validateUrl)) {
    return { status: "error", responseTime: 0, error: "SSRF blocked" };
  }

  const { url, headers } = buildRequestParams(key, provider.validateUrl, provider.validateHeader);
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), provider.timeoutMs);

    const response = await fetch(url, {
      method: provider.validateMethod,
      headers,
      signal: controller.signal as import("node-fetch").RequestInit["signal"],
    });

    clearTimeout(timeoutId);

    const rawMs = Date.now() - start;
    const responseTime = Math.round(rawMs / 100) * 100;

    // Parse body (best-effort) so we can return a real provider error message.
    let bodyText = "";
    try { bodyText = await response.text(); } catch { /* ignore */ }
    let bodyJson: any = null;
    try { bodyJson = bodyText ? JSON.parse(bodyText) : null; } catch { /* not json */ }
    const providerMsg =
      bodyJson?.error?.message ||
      bodyJson?.message ||
      bodyJson?.detail ||
      (typeof bodyJson?.error === "string" ? bodyJson.error : null) ||
      (bodyText && bodyText.length < 240 ? bodyText : null);

    const tier = tierFromHeaders(response.headers);

    if (response.status === 401 || response.status === 403) {
      recordFailure(provider.slug);
      return { status: "invalid", responseTime, error: providerMsg ?? `HTTP ${response.status}`, tier };
    }
    if (response.status === 429) {
      return { status: "rate_limited", responseTime, error: providerMsg ?? "Rate limited", tier };
    }
    if (response.ok) {
      recordSuccess(provider.slug);
      return { status: "valid", responseTime, tier };
    }
    // 4xx other than auth → likely bad request shape, not key invalidity.
    if (response.status >= 400 && response.status < 500) {
      recordFailure(provider.slug);
      return { status: "error", responseTime, error: providerMsg ?? `HTTP ${response.status}`, tier };
    }

    recordFailure(provider.slug);
    return { status: "error", responseTime, error: providerMsg ?? `HTTP ${response.status}`, tier };
  } catch (err) {
    const rawMs = Date.now() - start;
    const responseTime = Math.round(rawMs / 100) * 100;
    recordFailure(provider.slug);
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("aborted") || msg.includes("timeout")) {
      return { status: "error", responseTime, error: "Request timed out" };
    }
    return { status: "error", responseTime, error: msg };
  }
}

export async function pingProviderEndpoint(
  url: string,
  timeoutMs: number,
): Promise<{ reachable: boolean; responseTime?: number; statusCode?: number }> {
  if (isSsrfBlocked(url)) {
    return { reachable: false };
  }
  const start = Date.now();
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal as import("node-fetch").RequestInit["signal"],
    });
    return {
      reachable: true,
      responseTime: Date.now() - start,
      statusCode: response.status,
    };
  } catch {
    return { reachable: false, responseTime: Date.now() - start };
  }
}

/**
 * Per-provider metadata extending the validation config with chat capability,
 * recommended encryption / storage practice, and the canonical key prefix that
 * each provider issues.  All entries here describe REAL endpoints — the chat
 * route uses these to forward user-supplied keys to the actual provider.
 *
 * For chat: format "openai" means OpenAI-compatible /v1/chat/completions.
 * format "gemini" means Google generateContent endpoint.
 */
export const BUILTIN_PROVIDERS = [
  {
    slug: "gemini", name: "Google Gemini", category: "ai",
    validateUrl: "https://generativelanguage.googleapis.com/v1beta/models?key=__KEY__",
    validateMethod: "GET", validateHeader: "x-goog-api-key",
    prefixPattern: "AIza", docsUrl: "https://ai.google.dev/", timeoutMs: 10000,
    chatFormat: "gemini",
    chatUrl: "https://generativelanguage.googleapis.com/v1beta/models/__MODEL__:generateContent?key=__KEY__",
    modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models?key=__KEY__",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256 fingerprint", note: "Bind ke service account; rotasi 90 hari." },
  },
  {
    slug: "groq", name: "Groq", category: "ai",
    validateUrl: "https://api.groq.com/openai/v1/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: "gsk_", docsUrl: "https://console.groq.com/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://api.groq.com/openai/v1/chat/completions",
    modelsUrl: "https://api.groq.com/openai/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "Argon2id (kalau perlu password-derived)", note: "Free tier: 30 req/min — pasang circuit breaker." },
  },
  {
    slug: "openrouter", name: "OpenRouter", category: "ai",
    validateUrl: "https://openrouter.ai/api/v1/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: "sk-or-", docsUrl: "https://openrouter.ai/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://openrouter.ai/api/v1/chat/completions",
    modelsUrl: "https://openrouter.ai/api/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "Pakai HTTP-Referer header sesuai TOS." },
  },
  {
    slug: "together", name: "Together AI", category: "ai",
    validateUrl: "https://api.together.xyz/v1/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: null, docsUrl: "https://together.ai/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://api.together.xyz/v1/chat/completions",
    modelsUrl: "https://api.together.xyz/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "Rotasi reguler." },
  },
  {
    slug: "cohere", name: "Cohere", category: "ai",
    validateUrl: "https://api.cohere.ai/v1/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: null, docsUrl: "https://cohere.com/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://api.cohere.ai/compatibility/v1/chat/completions",
    modelsUrl: "https://api.cohere.ai/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "—" },
  },
  {
    slug: "mistral", name: "Mistral AI", category: "ai",
    validateUrl: "https://api.mistral.ai/v1/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: null, docsUrl: "https://mistral.ai/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://api.mistral.ai/v1/chat/completions",
    modelsUrl: "https://api.mistral.ai/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "—" },
  },
  {
    slug: "huggingface", name: "HuggingFace", category: "ai",
    validateUrl: "https://huggingface.co/api/whoami-v2",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: "hf_", docsUrl: "https://huggingface.co/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://router.huggingface.co/v1/chat/completions",
    modelsUrl: "https://router.huggingface.co/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "Token bisa di-scope ke read-only." },
  },
  {
    slug: "replicate", name: "Replicate", category: "ai",
    validateUrl: "https://api.replicate.com/v1/account",
    validateMethod: "GET", validateHeader: "Authorization: Token",
    prefixPattern: "r8_", docsUrl: "https://replicate.com/", timeoutMs: 10000,
    chatFormat: "none",
    chatUrl: "", modelsUrl: "https://api.replicate.com/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "Pakai header `Authorization: Token <key>`." },
  },
  {
    slug: "stability", name: "Stability AI", category: "ai",
    validateUrl: "https://api.stability.ai/v1/user/account",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: "sk-", docsUrl: "https://stability.ai/", timeoutMs: 10000,
    chatFormat: "none",
    chatUrl: "", modelsUrl: "https://api.stability.ai/v1/engines/list",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "—" },
  },
  {
    slug: "deepinfra", name: "DeepInfra", category: "ai",
    validateUrl: "https://api.deepinfra.com/v1/openai/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: null, docsUrl: "https://deepinfra.com/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://api.deepinfra.com/v1/openai/chat/completions",
    modelsUrl: "https://api.deepinfra.com/v1/openai/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "—" },
  },
  {
    slug: "perplexity", name: "Perplexity", category: "ai",
    validateUrl: "https://api.perplexity.ai/chat/completions",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: "pplx-", docsUrl: "https://perplexity.ai/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://api.perplexity.ai/chat/completions",
    modelsUrl: "",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "Models list tidak di-expose; pakai daftar statis." },
  },
  {
    slug: "fireworks", name: "Fireworks AI", category: "ai",
    validateUrl: "https://api.fireworks.ai/inference/v1/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: "fw-", docsUrl: "https://fireworks.ai/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://api.fireworks.ai/inference/v1/chat/completions",
    modelsUrl: "https://api.fireworks.ai/inference/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "—" },
  },
  {
    slug: "cerebras", name: "Cerebras", category: "ai",
    validateUrl: "https://api.cerebras.ai/v1/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: "csk-", docsUrl: "https://cerebras.ai/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://api.cerebras.ai/v1/chat/completions",
    modelsUrl: "https://api.cerebras.ai/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "—" },
  },
  {
    slug: "nvidia", name: "NVIDIA NIM", category: "ai",
    validateUrl: "https://integrate.api.nvidia.com/v1/models",
    validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: "nvapi-", docsUrl: "https://developer.nvidia.com/", timeoutMs: 10000,
    chatFormat: "openai",
    chatUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    modelsUrl: "https://integrate.api.nvidia.com/v1/models",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "—" },
  },
  {
    slug: "custom", name: "Custom", category: "custom",
    validateUrl: "", validateMethod: "GET", validateHeader: "Authorization",
    prefixPattern: null, docsUrl: "", timeoutMs: 10000,
    chatFormat: "none", chatUrl: "", modelsUrl: "",
    encryption: { atRest: "AES-256-GCM", inTransit: "TLS 1.3", hashing: "SHA-256", note: "Konfigurasi sesuai dokumentasi vendor." },
  },
];

export function getBuiltinProvider(slug: string) {
  return BUILTIN_PROVIDERS.find((p) => p.slug === slug) ?? null;
}
