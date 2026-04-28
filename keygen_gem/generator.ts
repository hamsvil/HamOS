import crypto from "crypto";

export type KeyFormat = "hex" | "base64" | "alphanumeric" | "uuid";

export const PROVIDER_PREFIXES: Record<string, string> = {
  gemini: "AIza",
};

/**
 * [SINGULARITY LOGIC]
 * Generates a mockup Gemini API Key.
 * NOTE: This is for internal testing/mockup only.
 */
export function generateGeminiKey(format: KeyFormat = "alphanumeric", length: number = 39): string {
  const prefix = PROVIDER_PREFIXES.gemini;
  let rawKey: string;
  
  switch (format) {
    case "hex":
      rawKey = crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
      break;
    case "base64":
      rawKey = crypto.randomBytes(Math.ceil(length * 0.75)).toString("base64url").slice(0, length);
      break;
    case "alphanumeric": {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
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
  
  return `${prefix}${rawKey}`;
}

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
