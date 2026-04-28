import { storage } from '../platform';

export class BudgetGuardian {
  private dailyCapTokens: number;
  private currentUsage: number = 0;
  private softLimitPrecent = 0.8;
  private lastResetDay: number;
  private readonly STORAGE_KEY = 'budget_guardian_usage';

  constructor(dailyCap: number = 1000000) {
    this.dailyCapTokens = dailyCap;
    this.lastResetDay = new Date().getUTCDate();
  }

  public async initialize() {
    const saved = await storage.getItem<{ usage: number, day: number }>(this.STORAGE_KEY);
    if (saved) {
      if (saved.day === new Date().getUTCDate()) {
        this.currentUsage = saved.usage;
      }
    }
  }

  public async addUsage(tokens: number) {
    // Reset logic
    const today = new Date().getUTCDate();
    if (this.lastResetDay !== today) {
      this.currentUsage = 0;
      this.lastResetDay = today;
    }

    this.currentUsage += tokens;
    
    if (this.currentUsage >= this.dailyCapTokens) {
      console.error('[BudgetGuardian] 🚨 HARD LIMIT REACHED. Sovereign operations suspended.');
    } else if (this.currentUsage >= this.dailyCapTokens * this.softLimitPrecent) {
      console.warn(`[BudgetGuardian] ⚠️ SOFT WARNING: ${Math.round((this.currentUsage/this.dailyCapTokens)*100)}% of daily token budget consumed.`);
    }

    await storage.setItem(this.STORAGE_KEY, { usage: this.currentUsage, day: this.lastResetDay });
  }

  public isExhausted(): boolean {
    return this.currentUsage >= this.dailyCapTokens;
  }
}
