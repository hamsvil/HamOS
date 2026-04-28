 
// @ts-nocheck
/**
 * ════════════════════════════════════════════════════════════════
 * HAM AISTUDIO — CENTRALIZED API KEY CONFIGURATION
 * ════════════════════════════════════════════════════════════════
 *
 * Edit file ini untuk mengganti API key.
 * Semua provider membaca dari sini sebagai PRIORITAS TERTINGGI.
 *
 * Dapatkan API key gratis:
 *  - Gemini  : https://aistudio.google.com/app/apikey
 * ════════════════════════════════════════════════════════════════
 */

export const HARDCODED_KEYS = {
  /**
   * Gemini API Keys (Google AI Studio — Free Tier)
   * Bisa isi lebih dari satu untuk auto-rotate saat rate limit.
   * Kosongkan string ("") untuk melewati key tersebut.
   */
  GEMINI: [
    "AIzaSyD5E98GsE4fh2-GYg7pQq1ChiIeFVj5QV0",
    "AIzaSyAaYFcjKiyHGizcximoO__UqGfz_reI0_Y",
    "AIzaSyDFuGtad9xHuXRiOhCmbkoPRVXQM30qlP0",
    "AIzaSyDW27ki-wwrNHnb37JtsPmkUZu5178LOSk",
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) || "",
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY_1 : undefined) || "",
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY_2 : undefined) || "",
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY_3 : undefined) || "",
    // ── Rolling Pool (Phase 4 addition) ──
    "AIzaSyCc1JzfMMbaLaW6iofoRAjOCs-TOr722Xk",
    "AIzaSyC_GtMRdx-SNeljqjHvLSDmwAe3Cnde944",
    "AIzaSyATEOpDthvIVTe9Qmibj-SUaldX4bAR_fg",
    "AIzaSyCB5rT0XOmM3Uya-RCvv9nH4ejzJKbO4mo",
    "AIzaSyA3oECm3LPMJiGrnOqgP4HOmVc8lIzaRmU",
    "AIzaSyALDZbARVJH6y3NdGA3qF8R79PKRumnnY4",
    "AIzaSyAc7az8XsCm8VJpLl1FJaVW4w6G0r_hkuU",
    "AIzaSyAMDt-AnUh72Ldjx2u_iYyKcsg-T_mm4aw",
    "AIzaSyBZEwTq2cCpgiT5HayETbmH9h6E_z-QUJk",
    "AIzaSyD9ly0N4nECU1K4Jccp6hb24h6Lta45oy0",
    "AIzaSyADxb0Q8QR93h4X8pvzIxXqx8-BEtFUAYU",
    "AIzaSyCAijqPGvboRewF_u9_wDx_xLlmhlALZ94",
    "AIzaSyA6F3Dn2utIvC7-NSx7jBghTZt2LQXcxUg",
    "AIzaSyBhroqNz4na_mLTDgL0lj9NZ7mPXR7jGK4",
    "AIzaSyB5EZd5TDSewEknq_ewiNqLIxoHyn0Y8Ko",
    "AIzaSyB2IreGlyNSHbZBaMczHIrLvrv5W-9GEVQ",
    "AIzaSyA3BnHJLqdy6rWawECvLIZwks7N255H-kw",
    "AIzaSyCE1wxqZWspj2j-ioar9zW35RgBzlQd4aE",
    "AIzaSyBGWh0ARwthHTvwluDGL8g-nS94NCw8kbg",
    "AIzaSyD6HPYlHNEK6xjtyGxh_EKJQAHHSslua8Q",
    "AIzaSyB8gB3iAL-QiE5rlAVDt_Kr0iNiAerUdJw",
    "AIzaSyDvIYwFqS2uO8fNE5ir2Evm-O8ZShDb35w",
    "AIzaSyBH5FUtHMD8XlRyTNXHUCZsPTp4s44WEAk",
    "AIzaSyA18ZJclMXQyDfzgEXhcVnVOQlSNLCdj28",
    "AIzaSyDiYD56fkO3OM9mGgO24eFh3chwtwKWcSA",
    "AIzaSyBQMajtT3U5ExIjlJUtBwQ-gSEAiWdM2jo",
    "AIzaSyAtTojeyFXbqH0Q9f8lS8RgYMVzMfKxDBE",
    "AIzaSyD-Rh8PlK094w5hKjySYo5aKOlM2Hu7vjw",
    "AIzaSyAIZEgRIQ4cB_nIq92r4ecQ8WffrznYzPc",
    "AIzaSyA-5DEyY6_z131rEah9gVRRpk-2DHd9_qs",

  ],
} as const;

/**
 * Mengambil semua Gemini key yang valid (tidak kosong)
 * Prioritaskan pembacaan dari /.listkey.example jika tersedia di VFS
 */
export async function getDynamicGeminiKeys(): Promise<string[]> {
  const staticKeys = HARDCODED_KEYS.GEMINI.filter(k => k && k.trim().length > 10);
  
  if (typeof window !== 'undefined') {
    try {
      const { vfs } = await import('../services/vfsService');
      if (await vfs.exists('/.listkey.example')) {
        const content = await vfs.readFile('/.listkey.example');
        const dynamicKeys = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#') && line.length > 20);
        
        if (dynamicKeys.length > 0) {
          // Merge and deduplicate
          return Array.from(new Set([...dynamicKeys, ...staticKeys]));
        }
      }
    } catch (e) {
      console.warn('[KEYS] Failed to load dynamic keys from reference file:', e);
    }
  } else {
    // Node.js fallback
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const filePath = path.resolve(process.cwd(), '.listkey.example');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const dynamicKeys = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#') && line.length > 20);
        
        if (dynamicKeys.length > 0) {
          return Array.from(new Set([...dynamicKeys, ...staticKeys]));
        }
      }
    } catch (e) {
       // Ignore Node.js fs errors in edge environments
    }
  }
  
  return staticKeys;
}

/**
 * Legacy support for synchronous key fetching
 */
export function getValidGeminiKeys(): string[] {
  return HARDCODED_KEYS.GEMINI.filter(k => k && k.trim().length > 10);
}

/**
 * Mengambil Gemini key pertama yang valid, atau string kosong jika tidak ada
 */
export function getPrimaryGeminiKey(): string {
  return getValidGeminiKeys()[0] ?? "";
}
