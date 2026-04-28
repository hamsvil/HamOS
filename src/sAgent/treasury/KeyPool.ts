import { getDynamicGeminiKeys } from '../../config/hardcodedKeys';

export class KeyPool {
  private keys: string[] = [];
  private activeIndex: number = 0;
  private penalties: Map<string, number> = new Map(); // key -> expiration time

  public async initialize() {
    this.keys = await getDynamicGeminiKeys();
    if (typeof process !== 'undefined' && process.env.GEMINI_API_KEY && !this.keys.includes(process.env.GEMINI_API_KEY)) {
      this.keys.unshift(process.env.GEMINI_API_KEY);
    }
    console.log(`[KeyPool] Initialized with ${this.keys.length} keys.`);
  }

  public getAvailableKey(): string | null {
    if (this.keys.length === 0) return null;

    const startIndex = this.activeIndex;
    let attempts = 0;

    while (attempts < this.keys.length) {
      const candidateKey = this.keys[this.activeIndex];
      const penaltyExpiration = this.penalties.get(candidateKey);

      if (!penaltyExpiration || Date.now() > penaltyExpiration) {
        // Key is good
        if (penaltyExpiration) {
          this.penalties.delete(candidateKey);
        }
        return candidateKey;
      }

      // Key is penalized, try next
      this.activeIndex = (this.activeIndex + 1) % this.keys.length;
      attempts++;
    }

    // All keys penalized, fallback to first key (at least try)
    return this.keys[0];
  }

  public reportExhaustion(key: string, cooldownMs: number = 60000) {
    console.warn(`[KeyPool] Key exhausted/penalized. Cooldown: ${cooldownMs}ms`);
    this.penalties.set(key, Date.now() + cooldownMs);
    
    // Auto-advance active index
    if (this.keys[this.activeIndex] === key) {
      this.activeIndex = (this.activeIndex + 1) % this.keys.length;
    }
  }

  public getStatus() {
    return {
      totalKeys: this.keys.length,
      activePenalties: this.penalties.size,
      currentIndex: this.activeIndex
    };
  }
}
