
/**
 * [SUPREME KEY ROTATOR]
 * Singleton manager to track API Key health globally across all swarm agents.
 * Implements "Penalty Queue" logic: failed keys go to the back, successful keys stay front.
 */
export class KeyRotator {
  private static instance: KeyRotator;
  private globalFallbackPool: string[] = [];

  private constructor() {}

  public static getInstance(): KeyRotator {
    if (!KeyRotator.instance) {
      KeyRotator.instance = new KeyRotator();
    }
    return KeyRotator.instance;
  }

  /**
   * Updates the global pool with new keys while preserving penalty order.
   */
  public registerKeys(keys: string[]) {
    keys.forEach(k => {
      if (!this.globalFallbackPool.includes(k)) {
        this.globalFallbackPool.push(k);
      }
    });
    console.log(`[KeyRotator] Pool updated. Total global keys: ${this.globalFallbackPool.length}`);
  }

  /**
   * Returns a prioritized queue for a specific agent.
   * Agent-specific keys (like env keys) always come first? 
   * No, actually we let the rotator decide the best order based on health.
   */
  public getCombinedQueue(agentSpecificKeys: string[] = []): string[] {
    const combined = [...agentSpecificKeys, ...this.globalFallbackPool];
    // Deduplicate while preserving order (Priority Keys -> Global Pool)
    return Array.from(new Set(combined));
  }

  /**
   * Penalizes a key by moving it to the absolute bottom of the global queue.
   */
  public reportFailure(key: string) {
    const idx = this.globalFallbackPool.indexOf(key);
    if (idx !== -1) {
      console.warn(`[KeyRotator] PENALTY: Moving failed key ${key.substring(0, 10)}... to the end of the global queue.`);
      this.globalFallbackPool.splice(idx, 1);
      this.globalFallbackPool.push(key);
    }
  }

  /**
   * Proven functioning key stays or moves to the front. 
   * This ensures that "proven good" keys are used first by all agents.
   */
  public reportSuccess(key: string) {
    const idx = this.globalFallbackPool.indexOf(key);
    if (idx > 0) {
      // Prioritize this key for other agents too
      this.globalFallbackPool.splice(idx, 1);
      this.globalFallbackPool.unshift(key);
    }
  }
}
