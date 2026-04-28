import { GoogleGenAI } from '@google/genai';
import { KeyPool } from './KeyPool';
import { TokenBucket } from './TokenBucket';
import { DailyQuota } from './DailyQuota';
import { BudgetGuardian } from './BudgetGuardian';
import { ModelMigrator } from './ModelMigrator';

/**
 * Treasury - The single source of truth for resources and budget
 */
export class Treasury {
  private static instance: Treasury;
  
  public keyPool = new KeyPool();
  private bucket = new TokenBucket(100, 20); // 100 capacity, 20 req/s local limit
  public quota = new DailyQuota();
  public guardian = new BudgetGuardian(10000000); // 10M token soft cap

  private constructor() {}

  public static getInstance(): Treasury {
    if (!Treasury.instance) {
      Treasury.instance = new Treasury();
    }
    return Treasury.instance;
  }

  public async initialize() {
    await Promise.all([
      this.keyPool.initialize(),
      this.quota.initialize(),
      this.guardian.initialize()
    ]);
    console.log('[Treasury] Fully initialized.');
  }

  public async getClient(request: { model: string }): Promise<{ client: GoogleGenAI, key: string, model: string } | null> {
    if (this.guardian.isExhausted()) {
      throw new Error("Budget exhausted. Operations suspended.");
    }

    if (!this.bucket.checkAndConsume(1)) {
      // Very basic local throttle
      await new Promise(r => setTimeout(r, 1000));
    }

    const key = this.keyPool.getAvailableKey();
    if (!key) {
      throw new Error("No available API keys.");
    }

    await this.quota.increment(key);
    const resolvedModel = ModelMigrator.resolveModel(request.model);

    return {
      client: new GoogleGenAI({ apiKey: key }),
      key,
      model: resolvedModel
    };
  }

  public reportFailure(key: string) {
    this.keyPool.reportExhaustion(key);
  }

  public reportSuccess(key: string, estimatedTokens: number) {
    this.guardian.addUsage(estimatedTokens);
  }

  public getStatus() {
    return {
      keys: this.keyPool.getStatus(),
      budgetExhausted: this.guardian.isExhausted()
    };
  }
}

export const treasury = Treasury.getInstance();
