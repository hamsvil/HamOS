import { storage } from '../platform';

export class DailyQuota {
  private usages: Map<string, { requests: number, lastReset: number }> = new Map();
  private readonly STORAGE_KEY = 'daily_quota_usages';

  public async initialize() {
    const data = await storage.getItem<Record<string, { requests: number, lastReset: number }>>(this.STORAGE_KEY);
    if (data) {
      this.usages = new Map(Object.entries(data));
    }
  }

  public async increment(key: string) {
    this.checkReset(key);
    const usage = this.usages.get(key) || { requests: 0, lastReset: Date.now() };
    usage.requests++;
    this.usages.set(key, usage);
    await this.persist();
  }

  public getUsage(key: string): number {
    this.checkReset(key);
    return this.usages.get(key)?.requests || 0;
  }

  private checkReset(key: string) {
    const usage = this.usages.get(key);
    if (!usage) return;

    // Reset at roughly 05:00 UTC next day
    const now = new Date();
    const lastReset = new Date(usage.lastReset);
    
    if (now.getUTCDate() !== lastReset.getUTCDate() && now.getUTCHours() >= 5) {
      this.usages.set(key, { requests: 0, lastReset: Date.now() });
    }
  }

  private async persist() {
    await storage.setItem(this.STORAGE_KEY, Object.fromEntries(this.usages));
  }
}
