import crypto from "crypto";

export type KeyFormat = "hex" | "base64" | "alphanumeric" | "uuid" | "custom";

/**
 * Canonical prefix issued by each provider.  We add this prefix to internal
 * tokens so users can visually scan which provider a key is intended for.
 * NOTE: Adding the prefix does NOT make a random string a valid key against
 * that provider — only the provider can issue valid keys.  Internal tokens
 * are useful for app-level auth (your own backend), routing, or testing.
 */
export const PROVIDER_PREFIXES: Record<string, string> = {
  gemini: "AIza",
  groq: "gsk_",
  openrouter: "sk-or-",
  together: "tgp_",
  cohere: "co_",
  mistral: "mst_",
  huggingface: "hf_",
  replicate: "r8_",
  stability: "sk-",
  deepinfra: "di_",
  perplexity: "pplx-",
  fireworks: "fw-",
  cerebras: "csk-",
  nvidia: "nvapi-",
  openai: "sk-",
  anthropic: "sk-ant-",
};

export function getProviderPrefix(slug: string): string {
  return PROVIDER_PREFIXES[slug] ?? "";
}

export function generateRawKey(format: KeyFormat, length: number, customPrefix?: string): string {
  let rawKey: string;
  switch (format) {
    case "hex":
      rawKey = crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
      break;
    case "base64":
      rawKey = crypto.randomBytes(Math.ceil(length * 0.75)).toString("base64url").slice(0, length);
      break;
    case "alphanumeric": {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const bytes = crypto.randomBytes(length);
      rawKey = Array.from(bytes).map((b) => chars[b % chars.length]).join("");
      break;
    }
    case "uuid":
      rawKey = crypto.randomUUID().replace(/-/g, "");
      break;
    default:
      rawKey = crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
  }
  return customPrefix ? `${customPrefix}${rawKey}` : rawKey;
}

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function calculateEntropy(key: string): number {
  const freq: Record<string, number> = {};
  for (const c of key) freq[c] = (freq[c] ?? 0) + 1;
  const len = key.length;
  return -Object.values(freq).reduce((acc, count) => {
    const p = count / len;
    return acc + p * Math.log2(p);
  }, 0);
}

export function getKeyPrefix(key: string): string {
  return key.length <= 8 ? key : key.slice(0, 8);
}

export function getKeySuffix(key: string): string {
  return key.length <= 4 ? key : key.slice(-4);
}
