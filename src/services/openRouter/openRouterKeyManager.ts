/* eslint-disable no-useless-assignment */
import { safeStorage } from '../../utils/storage';

export class OpenRouterKeyManager {
  private static STORAGE_KEY = 'ham_openrouter_keys';
  private static CURRENT_INDEX_KEY = 'ham_openrouter_current_index';

  private static HARDCODED_KEYS = [
    process.env.OPENROUTER_API_KEY_1 || "",
    process.env.OPENROUTER_API_KEY_2 || "",
    process.env.OPENROUTER_API_KEY_3 || ""
  ].filter(k => k !== "");

  /**
   * Menyimpan array API Key dari pengguna
   */
  static setKeys(keys: string[]): void {
    safeStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    safeStorage.setItem(this.CURRENT_INDEX_KEY, '0'); // Reset ke key pertama
  }

  /**
   * Mengambil daftar semua keys (User Key + Hardcoded Backup)
   */
  static getKeys(): string[] {
    const keysStr = safeStorage.getItem(this.STORAGE_KEY);
    const userKeys = keysStr ? JSON.parse(keysStr) : [];
    
    const validUserKeys = userKeys.filter((k: string) => k && k.trim() !== '');
    if (validUserKeys.length > 0) {
      return [...validUserKeys, ...this.HARDCODED_KEYS];
    }
    
    return this.HARDCODED_KEYS;
  }

  /**
   * Mengambil Key yang sedang aktif saat ini
   */
  static getCurrentKey(): string | null {
    const keys = this.getKeys();
    if (keys.length === 0) return null;
    
    const currentIndex = parseInt(safeStorage.getItem(this.CURRENT_INDEX_KEY) || '0', 10);
    return keys[currentIndex % keys.length];
  }

  /**
   * Memutar ke Key berikutnya jika terjadi Rate Limit (429)
   */
  static rotateKey(): string | null {
    const keys = this.getKeys();
    if (keys.length <= 1) return this.getCurrentKey(); // Tidak bisa rotate jika hanya 1 key

    let currentIndex = parseInt(safeStorage.getItem(this.CURRENT_INDEX_KEY) || '0', 10);
    currentIndex = (currentIndex + 1) % keys.length;
    
    safeStorage.setItem(this.CURRENT_INDEX_KEY, currentIndex.toString());
    console.warn(`[OpenRouter] Rate limit tercapai. Memutar ke API Key indeks: ${currentIndex}`);
    
    return keys[currentIndex];
  }
}
