/* eslint-disable no-useless-assignment */
import { safeStorage } from '../utils/storage';

export class RollingKeyManager {
  private static STORAGE_KEY = 'ham_rolling_api_keys';

  static getKeys(): string[] {
    const keys = safeStorage.getItem(this.STORAGE_KEY);
    return keys ? JSON.parse(keys) : [];
  }

  static setKeys(keys: string[]): void {
    safeStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
  }

  static getNextKey(): string | null {
    const keys = this.getKeys();
    if (keys.length === 0) return null;
    
    // Simple round-robin rotation
    const currentIndex = parseInt(safeStorage.getItem('ham_key_index') || '0');
    const nextIndex = (currentIndex + 1) % keys.length;
    safeStorage.setItem('ham_key_index', nextIndex.toString());
    
    return keys[currentIndex];
  }
}
